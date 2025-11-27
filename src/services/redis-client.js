/**
 * Redis Client singleton.
 * @function RedisClient
 * @modules [redis@^5 pino@^10]
 * @envs [REDIS_URI, LOG_SERVICE_NAME]
 * @param {object} {
 *   REDIS_URI,    // {string} the redis service uri (redis[s]://[[username][:password]@][host][:port][/db-number])
 *   ...options,   // {null|object} the redis options: https://github.com/redis/node-redis/blob/HEAD/docs/client-configuration.md
 * }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/redis
 * @example
 * --------
 * const redisClient = await RedisClient({ REDIS_URI: "redis://localhost:6379/1" });
 * await redisClient.set('key', 'value');      
 * @dockerCompose
  # Redis service
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

  /*
   * Get instance
   */
  if ($instances[REDIS_URI]) {
    return $instances[REDIS_URI];
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { createClient } = await DynamicImport('redis@^5');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Options
   */
  if (!REDIS_URI) {
    logger.error(`${logPrefix}RedisClient [missing env]: REDIS_URI`);
    return;
  }
  logger.debug(`${logPrefix}RedisClient [setup] options (path: ${REDIS_URI})`, { REDIS_URI, logPrefix, ...options });

  /*
   * Instance
   */
  $instances[REDIS_URI] = createClient({
    socket: { reconnectStrategy: () => 3000 },
    ...options,
    url: REDIS_URI,
  });

  $instances[REDIS_URI].on('error', (error, con) => {
    logger.error(`${logPrefix}RedisClient [error] ${error?.message}`, { REDIS_URI, error: error?.message, con });
  });

  await $instances[REDIS_URI].connect().then(() => {
    logger.info(`${logPrefix}RedisClient [setup] starting!`);
  })

  return $instances[REDIS_URI];

}
