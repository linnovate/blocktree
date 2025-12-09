/**
 * Mongo Indexer Backups - Retrieves all indices matching a specific backup pattern for a given alias.
 * - Uses default envs: `MONGO_URI`.
 * - To enable debug logs set env: `DEBUG=blocktree:MongoIndexerBackups` or `DEBUG=blocktree`
 * 
 * @async
 * @function MongoIndexerBackups
 * @requires module:mongodb@^7
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.index - The public alias name (e.g., 'users').
 * @param {Object|null} ...options - Additional options passed directly to the `MongoClient` factory.
 *
 * @returns {Promise<{indices: string[], actives: string[]}>} Returns an object containing:
 * - `indices`: Array of all backup index names sorted by date (descending).
 * - `actives`: Array of index names that currently have the public alias attached.
 *
 * @example
 * const { indices, actives } = await MongoIndexerBackups({ index: 'users', MONGO_URI: 'mongodb://root:root@localhost:27017' });
 * console.log({ indices, actives });
 */
export async function MongoIndexerBackups({ index, ...options }) {

  /*
   * Imports
   */
  const { MongoClient } = await import('../services/mongo-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`MongoIndexerBackups [setup] options`, { namespace: 'MongoIndexerBackups', index, ...options });

  /*
   * Validation
   */
  if (!index) {
    logger.error('MongoIndexerBackups [missing option]: index');
    return;
  }

  /*
   * Setup & Helpers
   */
  // Initialize Client
  const db = await (await MongoClient({ logPrefix: 'MongoIndexerBackups:', ...options })).db();
  // Expected format: alias---2023.01.01_12-00-00
  const sortByTime = (array) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':')).getTime();
    return array.sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Get aliases
   */
  // Fetch all indices matching pattern `alias---*`
  const indicesData = (await db.listCollections({}, { nameOnly: true }).toArray())
    ?.map(i => i.name)
    ?.filter(name => name.startsWith(`${index}---`));
  // Sort all found backup indices by time
  const indices = sortByTime(indicesData);

  /*
   * Return
   */
  return { indices, actives: [index] };

}
