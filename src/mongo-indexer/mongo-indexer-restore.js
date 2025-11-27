/**
 * Mongo Indexer Restore.
 * @function MongoIndexerRestore
 * @modules [mongodb@^7 pino@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     index,      // {string} 
     backupIndex,      // {string}
     lastIndexCount: // {number} the count of lasts elastic index
     ...options,    // {null|object} the elastic options
   }
 * @return {bool} is done
 * @example const isDone = await MongoIndexerRestore({ index, backupIndex, lastIndexCount });
 */
export async function MongoIndexerRestore({ index, backupIndex, lastIndexCount, ...options }) {

  /*
   * Imports
   */
  const { MongoClient } = await import('../tools/mongo-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`MongoIndexerRestore [setup] options`, { index, backupIndex, lastIndexCount, ...options });

  /*
   * Options
   */
  if (!index) {
    return logger.error('MongoIndexerRestore [missing option]: index');
  }
  if (!backupIndex && !lastIndexCount) {
    return logger.error('MongoIndexerRestore [missing option]: backupIndex || lastIndexCount');
  }

  /*
   * Vars
   */
  const db = await (await MongoClient({ logPrefix: 'MongoIndexerRestore:', ...options })).db();
  const sortByTime = (obj) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll("_", " ").replaceAll("-", ":")).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Find by lastIndexCount
   */
  if (lastIndexCount && !backupIndex) {
    const indicesData = (await db.listCollections({}, { nameOnly: true }).toArray())
      ?.map(i => i.name)
      ?.filter(name => name.startsWith(`${index}---`));
    backupIndex = sortByTime(indicesData)[Math.hypot(lastIndexCount)];
  }

  /*
   * Update alias
   */
  const timeFormat = new Date().toLocaleString('en', { hour12: false })
    .replaceAll("/", ".")
    .replaceAll(", ", "_")
    .replaceAll(":", "-");

  await db.renameCollection(index, `${index}---${timeFormat}`);
  await db.renameCollection(backupIndex, index);
  logger.info('MongoIndexerRestore [aliases] succeeded', { index, backupIndex });

  return true;
}
