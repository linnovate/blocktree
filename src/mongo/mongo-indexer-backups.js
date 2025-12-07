
/**
 * Mongo Indexer Backups.
 * @function MongoIndexerBackups
 * @modules [mongodb@^7 pino@^10]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} {
     index,         // {string} the mongo index name
     ...options,    // {null|object} the mongo options
   }
 * @return {object} { data, actives }
 * @example const backupsList = await MongoIndexerBackups({ index });
 */
export async function MongoIndexerBackups({ index, ...options }) {

  /*
   * Imports
   */
  const { MongoClient } = await import('../services/mongo-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`MongoIndexerBackups [setup] options`, { namespace: 'MongoIndexerBackups', index, ...options });

  /*
   * Options
   */
  if (!index) {
    return logger.error('MongoIndexerBackups [missing option]: index');
  }

  /*
   * Vars
   */
  const db = await (await MongoClient({ logPrefix: 'MongoIndexerBackups:', ...options })).db();
  const sortByTime = (array) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':')).getTime();
    return array.sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Get aliases
   */
  const indicesData = (await db.listCollections({}, { nameOnly: true }).toArray())
    ?.map(i => i.name)
    ?.filter(name => name.startsWith(`${index}---`));
  const indices = sortByTime(indicesData);

  /*
   * Return
   */
  return { indices, actives: [index] };

}
