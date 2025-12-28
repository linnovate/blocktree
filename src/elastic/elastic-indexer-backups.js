/**
 * Elastic Indexer Backups - Retrieves all indices matching a specific backup pattern for a given alias.
 * - Uses default envs: `ELASTICSEARCH_URL`.
 * - To enable debug logs set env: `DEBUG=blocktree:ElasticIndexerBackups` or `DEBUG=blocktree`
 * 
 * @async
 * @function ElasticIndexerBackups
 * @requires module:@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.index - The public alias name (e.g., 'users').
 * @param {Object|null} ...options - Additional options passed directly to the `ElasticClient` factory. {@link https://github.com/linnovate/blocktree/blob/v2-dev/docs/elastic.md#ElasticClient|ElasticClient Options Documentation}
 *
 * @returns {Promise<{indices: string[], actives: string[]}>} Returns an object containing:
 * - `indices`: Array of all backup index names sorted by date (descending).
 * - `actives`: Array of index names that currently have the public alias attached.
 *
 * @example
 * const { indices, actives } = await ElasticIndexerBackups({ index: 'users', ELASTICSEARCH_URL: 'http://localhost:9200' });
 * console.log({ indices, actives });
 */
export async function ElasticIndexerBackups({ index, ...options }) {

  /*
   * Imports
   */
  const { ElasticClient } = await import('./elastic-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`ElasticIndexerBackups [setup] options`, { namespace: 'ElasticIndexerBackups', index, ...options });

  /*
   * Validation
   */
  if (!index) {
    logger.error('ElasticIndexerBackups [missing option]: index');
    return
  }

  /*
   * Setup & Helpers
   */
  // Initialize Client
  const client = await ElasticClient({ logPrefix: 'ElasticIndexerBackups:', ...options });
  // Helper: Normalize Client Differences (Elastic vs OpenSearch)
  const adaptarOut = (obj) => (client?.name == 'opensearch-js') ? obj?.body || {} : obj || {};
  // Expected format: alias---2023.01.01_12-00-00
  const sortByTime = (obj) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':')).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Get aliases
   */
  // Fetch all indices matching pattern `alias---*`
  const indicesData = await client.indices.get({ index: `${index}---*` }).then(data => adaptarOut(data));
  // Filter indices that specifically have the public alias attached 
  const actives = Object.keys(indicesData).filter(key => !!indicesData[key].aliases[index]);
  // Sort all found backup indices by time
  const indices = sortByTime(indicesData);

  /*
   * Return
   */
  return { indices, actives };

}
