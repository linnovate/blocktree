/**
 * Elastic Indexer Restore - Switches the public alias (e.g., 'users') to point to a specific backup timestamp index.
 * - Uses default envs: `ELASTICSEARCH_URL`.
 * - To enable debug logs set env: `DEBUG=blocktree:ElasticIndexerRestore` or `DEBUG=blocktree`
 * 
 * @async
 * @function ElasticIndexerRestore
 * @requires module:@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.index - The public alias name (e.g., 'users').
 * @param {string} options.backupIndex - The specific index name to restore to (e.g., 'users---2023.01.01...'). Optional if `lastIndexCount` is provided.
 * @param {string} options.lastIndexCount - The offset for the backup to restore (0 = latest, 1 = previous, etc.). Required if `backupIndex` is missing.
 * @param {Object|null} ...options - Additional options passed directly to the `ElasticClient` factory. {@link https://github.com/linnovate/blocktree/blob/v2-dev/docs/elastic.md#ElasticClient|ElasticClient Options Documentation}
 *
 * @returns {Promise<boolean>} Returns `true` if the restore operation was successful, otherwise `false`.
 *
 * @example
 * const isDone = await ElasticIndexerRestore({ index: 'users', lastIndexCount: 1, ELASTICSEARCH_URL: 'http://localhost:9200' });
 */
export async function ElasticIndexerRestore({ index, backupIndex, lastIndexCount, ...options }) {

  /*
   * Imports
   */
  const { ElasticClient } = await import('./elastic-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`ElasticIndexerRestore [setup] options`, { namespace: 'ElasticIndexerRestore', index, backupIndex, lastIndexCount, ...options });

  /*
   * Validation
   */
  if (!index) {
    logger.error('ElasticIndexerRestore [missing option]: index');
    return;
  }
  if (!backupIndex && !lastIndexCount) {
    logger.error('ElasticIndexerRestore [missing option]: backupIndex or lastIndexCount');
    return;
  }

  /*
   * Setup & Helpers
   */
  // Initialize Client
  const client = await ElasticClient({ logPrefix: 'ElasticIndexerRestore:', ...options });
  // Helper: Normalize Client Differences (Elastic vs OpenSearch)
  const adaptarOut = (obj) => (client?.name == 'opensearch-js') ? obj?.body || {} : obj || {};
  // Expected format: alias---2023.01.01_12-00-00
  const sortByTime = (obj) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':')).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Find by lastIndexCount
   */
  if (lastIndexCount && !backupIndex) {
    const indicesData = await client.indices.get({ index: `${index}---*` }).then(data => adaptarOut(data));
    backupIndex = sortByTime(indicesData)[Math.hypot(lastIndexCount)];
    logger.debug(`ElasticIndexerRestore [lastIndexCount] backupIndex - ${backupIndex} (lastIndexCount: ${lastIndexCount})`, { namespace: 'ElasticIndexer', index, lastIndexCount, backupIndex, indicesData });
  }

  /*
   * Update alias
   */
  // Fetch all indices matching pattern `alias---*`
  const aliases = await client.indices.getAlias({ name: index }).then(data => adaptarOut(data));
  // remove backup index from the list
  delete aliases[backupIndex];
  // Atomic Swap: Add New, Remove Old
  const resUpdateAliases = await client.indices.updateAliases({
    body: {
      actions: [
        { add: { index: backupIndex, alias: index } },
        ...Object.keys(aliases).map(key => ({ remove: { index: key, alias: index } })),
      ]
    }
  });

  if (resUpdateAliases?.error !== false) {
    logger.info(`ElasticIndexerRestore [restore] succeeded! (alias: ${index}, backupIndex: ${backupIndex})`);
    return true;
  } else {
    logger.error(`ElasticIndexerRestore [restore] failed! - ${resUpdateAliases?.error?.toString?.()} (alias: ${index}, index: ${backupIndex})`);
    return false;
  }

}
