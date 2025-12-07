/**
 * Elastic Indexer Backups.
 * @function ElasticIndexerBackups
 * @modules [@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3 pino@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     index,         // {string} the elastic index name
     ...options,    // {null|object} the elastic options
   }
 * @return {object} { data, actives }
 * @example const backupsList = await ElasticIndexerBackups({ index, ELASTICSEARCH_URL });
 */
export async function ElasticIndexerBackups({ index, ...options }) {

  /*
   * Imports
   */
  const { ElasticClient } = await import('../services/elastic-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`ElasticIndexerBackups [setup] options`, { namespace: 'ElasticIndexerBackups', index, ...options });

  /*
   * Options
   */
  if (!index) {
    return logger.error('ElasticIndexerBackups [missing option]: index');
  }

  /*
   * Vars
   */
  const client = await ElasticClient({ logPrefix: 'ElasticIndexerBackups:', ...options });
  const adaptarOut = (obj) => (client?.name == 'opensearch-js') ? obj?.body || {} : obj || {};
  const sortByTime = (obj) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':')).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Get aliases
   */
  const indicesData = await client.indices.get({ index: `${index}---*` }).then(data => adaptarOut(data));
  const actives = Object.keys(indicesData).filter(key => !!indicesData[key].aliases[index]);
  const indices = sortByTime(indicesData);

  /*
   * Return
   */
  return { indicesData, indices, actives };

}
