/**
 * Elastic Indexer Restore.
 * @function ElasticIndexerRestore
 * @modules [@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3 pino@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     index,      // {string} 
     backupIndex,      // {string}
     lastIndexCount: // {number} the count of lasts elastic index
     ...options,    // {null|object} the elastic options
   }
 * @return {bool} is done
 * @example const isDone = await ElasticIndexerRestore({ ELASTICSEARCH_URL, aliasName, indexName });
 */
export async function ElasticIndexerRestore({ index, backupIndex, lastIndexCount, ...options }) {

  /*
   * Imports
   */
  const { ElasticClient } = await import('../services/elastic-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`ElasticIndexerRestore [setup] options`, { index, backupIndex, lastIndexCount, ...options });

  /*
   * Options
   */
  if (!index) {
    return logger.error('ElasticIndexerRestore [missing option]: index');
  }
  if (!backupIndex && !lastIndexCount) {
    return logger.error('ElasticIndexerRestore [missing option]: backupIndex || lastIndexCount');
  }

  /*
   * Vars
   */
  const client = await ElasticClient({ logPrefix: 'ElasticIndexerRestore:', ...options });
  const adaptarOut = (obj) => (client?.name == "opensearch-js") ? obj?.body || {} : obj || {};
  const sortByTime = (obj) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll("_", " ").replaceAll("-", ":")).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Find by lastIndexCount
   */
  if (lastIndexCount && !backupIndex) {
    const indicesData = await client.indices.get({ index: `${index}---*` }).then(data => adaptarOut(data));
    backupIndex = sortByTime(indicesData)[Math.hypot(lastIndexCount)];
  }

  /*
   * Update alias
   */
  const aliases = await client.indices.getAlias({ name: index }).then(data => adaptarOut(data));
  delete aliases[backupIndex];
  // add new alias & remove old alias
  await client.indices.updateAliases({
    body: {
      actions: [
        { add: { index: backupIndex, alias: index } },
        ...Object.keys(aliases).map(index => ({ remove: { index, alias: index } })),
      ]
    }
  })
    .then(() => {
      logger.info('ElasticIndexerRestore [aliases] succeeded', { index, backupIndex, aliases: Object.keys(aliases) });
    })
    .catch((error) => {
      logger.error('ElasticIndexerRestore [aliases] failed', { index, backupIndex, aliases: Object.keys(aliases), error: error?.toString() });
    });

  return true;
}
