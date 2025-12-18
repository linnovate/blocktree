/**
 * Mongo Indexer - A utility to manage Zero-Downtime indexing (Blue/Green deployment) for Mongo.
 * - Uses default envs: `MONGO_URI`.
 * - Handles Index Rotation: Creates `index-name---YYYY.MM.DD_HH-mm-ss`.
 * - Manages Aliases: Atomically swaps the alias to the new index.
 * - Cleanup: Removes old indices based on `keepAliasesCount`.
 * - Bulk Indexing: Batches data efficiently.
 * - To enable debug logs set env: `DEBUG=blocktree:MongoIndexer` or `DEBUG=blocktree`
 * 
 * @async
 * @function MongoIndexer
 * @requires module:mongodb@^7
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.index - The public alias name (e.g., 'users').
 * @param {'new'|'clone'|'sync'} options.mode='new' -
 * - 'new': Creates a fresh, empty index.
 * - 'clone': Clones the currently active index (fast copy).
 * - 'sync': Updates the currently active index directly (no rotation).
 * @param {string|null} options.keyId='id' - The field name to use as the unique identifier for updates/upserts.
 * @param {number} options.keepAliasesCount=1 - Number of past indices to keep before deletion.
 * @param {Object|null} ...options - Additional options passed directly to the `MongoClient` factory. {@link https://github.com/linnovate/blocktree/blob/v2-dev/docs/mongo.md#MongoClient}
 *
 * @param {Function} batchCallback
 * Async function `({ offset, index, mode, response })`. Should return an Array of objects to index.
 * - Return `[]` or `null` to stop processing.
 * - To delete a doc, include property `{ delete: true }` in the object.
 * - `response` contains the result of the *previous* bulkWrite operation.
 *
 * @param {Function} testCallback
 * Async function `({ index, activeIndexName })`.
 * - Runs after indexing but *before* alias swapping.
 * - Return `true` to proceed, or throw/return error to abort
 *
 * @returns {Promise<{error: string|boolean}>} Returns `{ error: false }` on success or an object with an error code string.
 *
 * @example
 * const result = await MongoIndexer({
 *     index: 'users',
 *     MONGO_URI: 'mongodb://root:root@localhost:27017'
 *   },
 *   async ({ offset, index, mode, response }) => offset == 0 && [{ time: Date.now() }],
 *   async ({ index, activeIndexName }) => true,
 * );
 */
export async function MongoIndexer(
  {
    index,
    mode = 'new',
    keyId = 'id',
    keepAliasesCount = 1,
    ...options
  },
  batchCallback,
  testCallback = async () => true,
) {
 
  /*
   * Imports
   */
  const { MongoClient } = await import('./mongo-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`MongoIndexer [setup] options`, { namespace: 'MongoIndexer', index, mode, keyId, keepAliasesCount, ...options });

  /*
   * Validation
   */
  if (!index) {
    logger.error('MongoIndexer [missing option]: index');
    return { error: "NO_INDEX_NAME" };
  }

  /*
   * Setup & Helpers
   */
  // Initialize Client
  const client = await MongoClient({ logPrefix: 'MongoIndexer:', ...options });
  // Helper: Sort indices by timestamp suffix (newest first)
  const sortByTime = (array) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':').replaceAll('--draf', '')).getTime();
    return array.sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * 1. Determine Indices
   */
  logger.debug(`MongoIndexer (1/5)[determine-indice] start! (alias: ${index})`, { namespace: 'MongoIndexer', index, mode });

  // Get existing alias info
  const indexAliases = (await client.db().listCollections({}, { nameOnly: true }).toArray())
    ?.map(i => i.name)
    ?.filter(name => name.startsWith(`${index}---`) || name == index);
  const lastIndexName = indexAliases.find(name => name == index);
  
  // Generate a new index name
  const timeFormat = new Date().toLocaleString('en', { hour12: false }).replaceAll('/', '.').replaceAll(', ', '_').replaceAll(':', '-');
  let activeIndexName = `${index}---${timeFormat}`;

  // Mode Logic
  let resUseIndex;
  if (mode == 'sync' && lastIndexName) {
    activeIndexName = lastIndexName;
    resUseIndex = true;
  }
  else if (mode == 'clone' && lastIndexName) {
    resUseIndex = await client.db().collection(index).aggregate([{ $out: activeIndexName }]);
  }
  else {
    // Mode 'new' or first run
    resUseIndex = await client.db().createCollection(activeIndexName);
  }

  logger.debug(`MongoIndexer (1/5)[determine-indice] end! (${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`, { namespace: 'MongoIndexer', index, mode, activeIndexName, lastIndexName, indexAliases });
  
  if (resUseIndex) {
    logger.info(`MongoIndexer (1/5)[determine-indice] succeeded! (alias: ${index}, ${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (1/5)[determine-indice] failed! (alias: ${index}, ${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`);
    return { error: "DETERMINE_INDICE_FAILED" };
  }
  
  /*
   * 2. Insert Data (Batch Loop)
   */
  let offset = 0;
  let batchSuccess = true;
  let lastBulkResponse = null;
  
  while (true) {
    logger.debug(`MongoIndexer (2/5)[insert-data] batch (index: ${activeIndexName}, offset: ${offset})`, { namespace: 'MongoIndexer', index, mode, activeIndexName });
    // Fetch Batch
    const items = await batchCallback({ offset, index, mode, response: lastBulkResponse }).catch((error) => ({ error }));
    // Batch failed
    if (items?.error) {
      logger.error(`MongoIndexer (2/5)[insert-data] callback - ${items?.error?.toString?.()} (index: ${activeIndexName}, offset: ${offset})`);
      batchSuccess = false;
      break;
    }
    // Stop if empty or null
    if (!items?.length) {
      break;
    }
    // Prepare Bulk Operations 
    const operations = items.map(item => {
      const filter = (keyId in item) ? { [keyId]: item[keyId] } : {};
      if (item?.deleted) {
        return { deleteOne: { filter } }
      } else {
        return { updateOne: { filter, update: { $set: item }, upsert: true } }
      }
    })
    // Send to Mongo
    lastBulkResponse = await client.db().collection(activeIndexName).bulkWrite(operations, { ordered: false })
      .catch(error => ({ error }));
    // Log generic error, but usually we continue unless critical
    if (lastBulkResponse?.error) {
      logger.error(`MongoIndexer (2/5)[insert-data] bulk - ${lastBulkResponse?.error} (index: ${activeIndexName}, offset: ${offset})`);
    }
    offset += items.length;
  }

  if (batchSuccess) {
    logger.info(`MongoIndexer (2/5)[insert-data] succeeded! (index: ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (2/5)[insert-data] failed! (index: ${activeIndexName})`);
    return { error: "INSERT_DATA_FAILED" };
  }
  
  /*
   * 3. Test Data
   */
  const resTestCallback = await testCallback?.({ index, activeIndexName })
    ?.catch(error => ({ error }));
  // Check: Must explicitly return true, or simply not return an error object
  if (resTestCallback === true && resTestCallback?.error !== false) {
    logger.info(`MongoIndexer (3/5)[test-data] succeeded! (index: ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (3/5)[test-data] failed! - ${resTestCallback?.error?.toString?.()} (index: ${activeIndexName})`);
    return { error: "TEST_DATA_FAILED" };
  }

  /*
   * 4. Update Aliases
   * Strategy:
   * 1. Rename `live` -> `new_name--draft` (Preserves old data temporarily)
   * 2. Rename `new_name` -> `live` (The critical swap)
   * 3. Rename `new_name--draft` -> `new_name` (Archives old data at the timestamped name)
   */
  logger.debug('MongoIndexer (4/5)[update-aliases] start!', { namespace: 'MongoIndexer', index, mode, activeIndexName });
   
  const res1 = lastIndexName && await client.db().renameCollection(index, `${activeIndexName}--draf`).catch((error) => ({ error }));
  const res2 = (activeIndexName !== index) && await client.db().renameCollection(activeIndexName, index).catch((error) => ({ error }));
  const res3 = lastIndexName && await client.db().renameCollection(`${activeIndexName}--draf`, `${activeIndexName}`).catch((error) => ({ error }));
  const error = res1?.error?.toString() || res2?.error?.toString() || res3?.error?.toString();
  
  logger.debug('MongoIndexer (4/5)[update-aliases] end!', { namespace: 'MongoIndexer', index, mode, activeIndexName, error });
  
  if (!error) {
    logger.info(`MongoIndexer (4/5)[update-aliases] succeeded! (alias: ${index}, index: ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (4/5)[update-aliases] failed! - ${error} (alias: ${index}, index: ${activeIndexName})`);
    return { error: "UPDATE_ALIASES_FAILED" };
  }
  
  /*
   * 5. Remove Old Indices
   */
  logger.debug('MongoIndexer (5/5)[remove-indices] start!', { namespace: 'MongoIndexer', index, mode, activeIndexName });
 
  // Fetch all indices matching pattern `alias---*`
  const indicesData = (await client.db().listCollections({}, { nameOnly: true }).toArray())
    ?.map(i => i.name)
    ?.filter(name => name.startsWith(`${index}---`));
  // Sort Newest -> Oldest. Splice off the ones we want to keep. The rest are deleted.
  const removeIndices = sortByTime(indicesData).splice(keepAliasesCount);
  // Remove old indexes  
  const resRemoveIndices = await Promise.all(
    removeIndices?.map(key => client.db().dropCollection(key) )
  ).catch(error => ({ error }));
  
  logger.debug('MongoIndexer (5/5)[remove-old-indices] end!', { namespace: 'MongoIndexer', index, mode, activeIndexName, indicesData, removeIndices });

  if (!resRemoveIndices?.error) {
    logger.info(`MongoIndexer (5/5)[remove-old-indices] succeeded! (alias: ${index}, index: ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (5/5)[remove-old-indices] failed! - ${resRemoveIndices?.error?.toString?.()} (alias: ${index}, index: ${activeIndexName})`);
    return { error: "REMOVE_OLD_INDICES_FAILED" };
  }
  
  return { error: false };
  
}
