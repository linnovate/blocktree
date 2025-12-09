/**
 * Redis Client - Singleton Redis Client instance.
 * - Uses default envs: `REDIS_URI`.
 * - To enable debug logs set env: `DEBUG=blocktree:RedisClient` or `DEBUG=blocktree`
 * 
 * @async
 * @function RedisClient
 * @requires module:redis@^5
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.REDIS_URI=process.env.REDIS_URI - Connection string (redis[s]://[[username][:password]@][host][:port][/db-number]).
 * @param {string|null} options.logPrefix - A string prefix to add to all internal log messages (e.g., `[my-service]`).
 * @param {Object|null} ...options - Additional standard `module:redis` options. {@link https://www.npmjs.com/package/redis}
 *
 * @returns {Promise<Object>} The initialized Redis Connection instance.
 *
 * @example
 * const redisClient = await RedisClient({ REDIS_URI: 'redis://localhost:6379/1' });
 * await redisClient.set('key', 'value');  
 *
 * @example
 * const storage = await RedisClient();
 * await storage.bucket('my-bucket').upload('./file.txt');
 * @example
# docker-compose.yaml for Redis
services:
  redis:
    image: redis:8-alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379
  */
const $instances = {};

export async function RedisClient({
  REDIS_URI = process.env.REDIS_URI,
  logPrefix = '',
  ...options
} = {}) {

  // Create a unique key for the singleton based on REDIS_URI
  const instanceKey = `${REDIS_URI}`;
  
  /*
   * Return Singleton if exists
   */
  if ($instances[instanceKey]) {
    return $instances[instanceKey];
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { createClient } = await DynamicImport('redis@^5');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Validation
   */
  if (!REDIS_URI) {
    logger.error(`${logPrefix}RedisClient [missing env]: REDIS_URI`);
    return;
  }
  logger.debug(`${logPrefix}RedisClient [setup] options (path: ${REDIS_URI})`, { namespace: 'RedisClient', REDIS_URI, logPrefix, ...options });

  /*
   * Create instance
   */
  $instances[instanceKey] = createClient({
    socket: { reconnectStrategy: () => 3000 },
    ...options,
    url: REDIS_URI,
  });

  /*
   * Create logger
   */
  $instances[instanceKey].on('error', (error) => {
    logger.error(`${logPrefix}RedisClient [error] ${error?.message}`);
  });

  await $instances[instanceKey].connect().then(() => {
    logger.info(`${logPrefix}RedisClient [setup] initialized!`);
  })

  return $instances[instanceKey];

}
