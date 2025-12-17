/**
 * Elastic Indexer - A utility to manage Zero-Downtime indexing (Blue/Green deployment) for Elasticsearch/OpenSearch.
 * - Uses default envs: `ELASTICSEARCH_URL`.
 * - Handles Index Rotation: Creates `index-name---YYYY.MM.DD_HH-mm-ss`.
 * - Manages Aliases: Atomically swaps the alias to the new index.
 * - Cleanup: Removes old indices based on `keepAliasesCount`.
 * - Bulk Indexing: Batches data efficiently.
 * - To enable debug logs set env: `DEBUG=blocktree:ElasticIndexer` or `DEBUG=blocktree`
 * 
 * @async
 * @function ElasticIndexer
 * @requires module:@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.index - The public alias name (e.g., 'users').
 * @param {'new'|'clone'|'sync'} options.mode='new' -
 * - 'new': Creates a fresh, empty index.
 * - 'clone': Clones the currently active index (fast copy).
 * - 'sync': Updates the currently active index directly (no rotation).
 * @param {string|null} options.keyId='id' - The field name in the data to use as the document _id.
 * @param {number} options.keepAliasesCount=1 - Number of past indices to keep before deletion.
 * @param {Object|null} options.mappings - Elastic index mappings. {@link https://www.elastic.co/docs/manage-data/data-store/mapping}
 * @param {Object|null} options.settings - Elastic index settings. {@link https://www.elastic.co/docs/reference/elasticsearch/index-settings}
 * @param {Object|null} options.bulkOptions - Options for bulk operations (e.g., routing, pipeline). {@link https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference#_bulk}
 * @param {Object|null} ...options - Additional options passed directly to the `ElasticClient` factory.
 *
 * @param {Function} batchCallback
 * Async function `({ offset, index, mode, response })`. Should return an Array of objects to index.
 * - Return `[]` or `null` to stop processing.
 * - To delete a doc, include property `{ delete: true }` in the object.
 * - `response` contains the result of the *previous* bulkWrite operation.
 *
 * @param {Function} testCallback
 * Async function `({ index, activeIndexName })`.
 * - Runs after indexing but before alias swapping.
 * - Return `true` to proceed, or throw/return error to abort.
 *
 * @returns {Promise<{error: string|boolean}>} Returns `{ error: false }` on success or an object with an error code string.
 *
 * @example
 * const result = await ElasticIndexer({
 *     index: 'users',
 *     ELASTICSEARCH_URL: 'http://localhost:9200'
 *   },
 *   async ({ offset, index, mode, response }) => offset == 0 && [{ time: Date.now() }],
 *   async ({ index, activeIndexName }) => true,
 * );
 */
export async function ElasticIndexer(
  {
    index,
    mode = 'new',
    keyId = 'id',
    keepAliasesCount = 1,
    mappings,
    settings,
    bulkOptions,
    ...options
  },
  batchCallback,
  testCallback = async () => true,
) {

  /*
   * Imports
   */
  const { ElasticClient } = await import('./elastic-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`ElasticIndexer [setup] options`, { namespace: 'ElasticIndexer', index, mode, keyId, keepAliasesCount, mappings, settings, bulkOptions, ...options });

  /*
   * Validation
   */
  if (!index) {
    logger.error('ElasticIndexer [missing option]: index');
    return { error: "NO_INDEX_NAME" };
  }

  /*
   * Setup & Helpers
   */
  // Initialize Client
  const client = await ElasticClient({ logPrefix: 'ElasticIndexer:', ...options });
  
  // Helper: Normalize Client Differences (Elastic vs OpenSearch)
  const adaptarIn = (obj) => (client?.name == 'opensearch-js') ? { body: obj } : obj;
  const adaptarOut = (obj) => (client?.name == 'opensearch-js') ? obj?.body || {} : obj || {};
  
  // Helper: Sort indices by timestamp suffix (newest first)
  const sortByTime = (obj) => {
    // Expected format: alias---2023.01.01_12-00-00
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':')).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * 1. Determine Indices
   */
  logger.debug(`ElasticIndexer (1/5)[determine-indice] start! (alias: ${index})`, { namespace: 'ElasticIndexer', index, mode });
 
  // Get existing alias info
  const indexAliases = await client.indices.getAlias({ name: index }).then(data => adaptarOut(data));
  const lastIndexName = sortByTime(indexAliases).reverse()[0];

  // Generate new index name
  const timeFormat = new Date().toLocaleString('en', { hour12: false }).replaceAll('/', '.').replaceAll(', ', '_').replaceAll(':', '-');
  let activeIndexName = `${index}---${timeFormat}`;

  // Mode Logic
  let resUseIndex;
  if (mode == 'sync' && lastIndexName) {
    activeIndexName = lastIndexName;
    resUseIndex = true;
  }
  else if (mode == 'clone' && lastIndexName) {
    resUseIndex = await client.reindex(adaptarIn({ source: { index: lastIndexName }, dest: { index: activeIndexName } }));
  }
  else {
    // Mode 'new' or first run
    resUseIndex = await client.indices.create({ index: activeIndexName, ...adaptarIn({ mappings, settings }) });
  }
  
  logger.debug(`ElasticIndexer (1/5)[determine-indice] end! (${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`, { namespace: 'ElasticIndexer', index, mode, activeIndexName, lastIndexName, indexAliases });
  
  if (resUseIndex) {
    logger.info(`ElasticIndexer (1/5)[determine-indice] succeeded! (alias: ${index}, ${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (1/5)[determine-indice] failed! (alias: ${index}, ${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`);
    return { error: 'DETERMINE_INDICE_FAILED' };
  }

  /*
   * 2. Insert Data (Batch Loop)
   */
  let offset = 0;
  let batchSuccess = true;
  let lastBulkResponse = null;
  
  while (true) {
    logger.debug(`ElasticIndexer (2/5)[insert-data] batch (index: ${activeIndexName}, offset: ${offset})`, { namespace: 'ElasticIndexer', index, mode, activeIndexName });
    // Fetch Batch
    const items = await batchCallback({ offset, index, mode, response: lastBulkResponse }).catch((error) => ({ error }));
    // Batch failed
    if (items?.error) {
      logger.error(`ElasticIndexer (2/5)[insert-data] callback - ${items?.error?.toString?.()} (index: ${activeIndexName}, offset: ${offset})`);
      batchSuccess = false;
      break;
    }
    // Stop if empty or null
    if (!items?.length) {
      break;
    }
    // Prepare Bulk Operations
    const operations = items.flatMap(item => [
      { [item.delete ? 'delete' : 'index']: { _index: activeIndexName, _id: item[keyId], ...bulkOptions } },
      item
    ]);
    // Send to Elastic
    const adaptarIn = (obj) => (client?.name == 'opensearch-js') ? { body: obj } : { operations: obj };
    lastBulkResponse = await client.bulk({ index: activeIndexName, refresh: true, ...adaptarIn(operations) }).then(data => adaptarOut(data));
    // Log generic error, but usually we continue unless critical
    if (lastBulkResponse?.errors !== false) {
      logger.error(`ElasticIndexer (2/5)[insert-data] bulk - ${lastBulkResponse?.errors} (index: ${activeIndexName}, offset: ${offset})`);
    }
    offset += items.length;
  }

  if (batchSuccess) {
    logger.info(`ElasticIndexer (2/5)[insert-data] succeeded! (index: ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (2/5)[insert-data] failed! (index: ${activeIndexName})`);
    return { error: "INSERT_DATA_FAILED" };
  }

  /*
   * 3. Test Data
   */
  const resTestCallback = await testCallback?.({ index, activeIndexName })
    ?.catch(error => ({ error }));
  // Check: Must explicitly return true, or simply not return an error object
  if (resTestCallback === true && resTestCallback?.error !== false) {
    logger.info(`ElasticIndexer (3/5)[test-data] succeeded! (index: ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (3/5)[test-data] failed! - ${resTestCallback?.error?.toString?.()} (index: ${activeIndexName})`);
    return { error: "TEST_DATA_FAILED" };
  }

  /*
   * 4. Update Aliases
   * Skip if in 'sync' mode (alias already points here).
   */
  let resUpdateAliases;
  if (lastIndexName && mode != 'sync') {
    logger.debug('ElasticIndexer (4/5)[update-aliases] start!', { namespace: 'ElasticIndexer', index, mode, activeIndexName });
    // Find existing indices pointing to this alias to remove them
    const removeAliases = await client.indices.getAlias({ name: index }).then(data => adaptarOut(data));
    // Atomic Swap: Add New, Remove Old
    resUpdateAliases = await client.indices.updateAliases({
      body: {
        actions: [
          { add: { index: activeIndexName, alias: index } },
          ...Object.keys(removeAliases).map(key => ({ remove: { index: key, alias: index } })),
        ]
      }
    });
    logger.debug('ElasticIndexer (4/5)[update-aliases] end!', { namespace: 'ElasticIndexer', index, mode, res: resUpdateAliases, activeIndexName, removeAliases });
  }
  
  if (resUpdateAliases?.error !== false) {
    logger.info(`ElasticIndexer (4/5)[update-aliases] succeeded! (alias: ${index}, index: ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (4/5)[update-aliases] failed! - ${resUpdateAliases?.error?.toString?.()} (alias: ${index}, index: ${activeIndexName})`);
    return { error: "UPDATE_ALIASES_FAILED" };
  }
  
  /*
   * 5. Remove Old Indices
   */
  logger.debug('ElasticIndexer (5/5)[remove-indices] start!', { namespace: 'ElasticIndexer', index, mode, activeIndexName });
 
  // Fetch all indices matching pattern `alias---*`
  const indicesData = await client.indices.get({ index: `${index}---*` }).then(data => adaptarOut(data));
  // remove active index from the list
  delete indicesData[activeIndexName];
  // Sort Newest -> Oldest. Splice off the ones we want to keep. The rest are deleted.
  const removeIndices = sortByTime(indicesData).splice(keepAliasesCount);
  // Remove old indexes
  const resRemoveIndices = await Promise.all(
    removeIndices?.map(index => client.indices.delete({ index, allow_no_indices: true }) )
  ).catch(error => ({ error }));
  
  logger.debug('ElasticIndexer (5/5)[remove-old-indices] end!', { namespace: 'ElasticIndexer', index, mode, activeIndexName, indicesData, removeIndices });
 
  if (resRemoveIndices?.error !== false) {
    logger.info(`ElasticIndexer (5/5)[remove-old-indices] succeeded! (alias: ${index}, index: ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (5/5)[remove-old-indices] failed! - ${resRemoveIndices?.error?.toString?.()} (alias: ${index}, index: ${activeIndexName})`);
    return { error: "REMOVE_OLD_INDICES_FAILED" };
  }
   
  return { error: false };

}
