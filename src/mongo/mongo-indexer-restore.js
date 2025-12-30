/**
 * Mongo Indexer Restore - Switches the public alias (e.g., 'users') to point to a specific backup timestamp index.
 * - Uses default envs: `MONGO_URI`.
 * - To enable debug logs set env: `DEBUG=blocktree:MongoIndexerRestore` or `DEBUG=blocktree`
 * 
 * @async
 * @function MongoIndexerRestore
 * @requires module:mongodb@^7
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.index - The public alias name (e.g., 'users').
 * @param {string} options.backupIndex - The specific index name to restore to (e.g., 'users---2023.01.01...'). Optional if `lastIndexCount` is provided.
 * @param {string} options.lastIndexCount - The offset for the backup to restore. Required if `backupIndex` is missing.
 * @param {Object|null} ...options - Additional options passed directly to the `MongoClient` factory. {@link https://github.com/linnovate/blocktree/blob/v2-dev/docs/mongo.md#MongoClient|MongoClient Options Documentation}
 *
 * @returns {Promise<boolean>} Returns `true` if the restore operation was successful, otherwise `false`.
 *
 * @example
 * const isDone = await MongoIndexerRestore({ index: 'users', lastIndexCount: 1, MONGO_URI: 'mongodb://root:root@localhost:27017' });
 */
export async function MongoIndexerRestore({ index, backupIndex, lastIndexCount, ...options }) {

  /*
   * Imports
   */
  const { MongoClient } = await import('./mongo-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`MongoIndexerRestore [setup] options`, { namespace: 'MongoIndexerRestore', index, backupIndex, lastIndexCount, ...options });

  /*
   * Validation
   */
  if (!index) {
    return logger.error('MongoIndexerRestore [missing option]: index');
  }
  if (!backupIndex && !lastIndexCount) {
    return logger.error('MongoIndexerRestore [missing option]: backupIndex or lastIndexCount');
  }

  /*
   * Setup & Helpers
   */
  // Initialize Client
  const db = await (await MongoClient({ logPrefix: 'MongoIndexerRestore:', ...options })).db();
  // Expected format: alias---2023.01.01_12-00-00
  const sortByTime = (array) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':')).getTime();
    return array.sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Find by lastIndexCount
   */
  if (lastIndexCount && !backupIndex) {
    const indicesData = (await db.listCollections({}, { nameOnly: true }).toArray())
      ?.map(i => i.name)
      ?.filter(name => name.startsWith(`${index}---`));
    backupIndex = sortByTime(indicesData)[Math.hypot(lastIndexCount) - 1];
  }

  /*
   * Update alias
   */
  const timeFormat = new Date().toLocaleString('en', { hour12: false })
    .replaceAll('/', '.')
    .replaceAll(', ', '_')
    .replaceAll(':', '-');
  // Rename 'index' to 'index---{timeFormat}' (Backup)
  const res1 = await db.renameCollection(index, `${index}---${timeFormat}`).catch((error) => ({ error }));
  // Rename 'backupIndex' to 'index' (Restore)
  const res2 = await db.renameCollection(backupIndex, index).catch((error) => ({ error }));
  const error = res1?.error?.toString() || res2?.error?.toString();

  if (!error) {
    logger.info(`MongoIndexerRestore [restore] succeeded! (alias: ${index}, backupIndex: ${backupIndex})`);
    return true;
  } else {
    logger.error(`MongoIndexerRestore [restore] failed! - ${error} (alias: ${index}, index: ${backupIndex})`);
    return false;
  }

}
