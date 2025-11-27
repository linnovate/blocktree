/**
 * Redis Proxy
 * @function RedisProxy
 * @modules [redis@^5 pino@^10 pino-pretty@^13]
 * @envs [REDIS_URI, LOG_SERVICE_NAME]
 * @param {string} the fetch url
 * @param {null|object} the fetch options
 * @param {null|object} {
     REDIS_URI,    // {string} the redis service uri (redis[s]://[[username][:password]@][host][:port][/db-number])
     noCache,      // {null|bool} is skip cache
     debug,        // {null|bool} is show logs
     callback,     // {null|function} get remote data (default: FetchClient)
     setOptions,   // {null|object} the redis client.set options (https://redis.io/commands/expire/)
     redisOptions, // {null|object} the redis options: https://github.com/redis/node-redis/blob/HEAD/docs/client-configuration.md
   }
 * @return {promise} the data
 * @example
 * --------
 * const data = await RedisProxy("[host]/api", {}, { debug: true });
 * @dockerCompose
  # Redis service
  redis:
    image: redis:8-alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379
 */
export async function RedisProxy(url, fetchOptions, { REDIS_URI, noCache, debug, callback, setOptions, redisOptions } = {}) {

  /*
   * Imports
   */
  const { RedisClient } = await import('../services/redis-client.js');
  const { FetchClient } = await import('../services/fetch-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  const client = await RedisClient({ REDIS_URI, ...redisOptions });

  let data;

  // load from cache
  if (!noCache) {

    data = await client.get(url);
    data = JSON.parse(data || null);

    if (debug && data) {
      logger.info('RedisProxy [from cache]', { url, REDIS_URI, noCache });
    }

  }

  // load from remote
  if (data == null) {

    if (callback) {
      data = await callback(url, fetchOptions);
    }
    else {
      const res = await FetchClient(url, fetchOptions);
      data = res.data;
    }

    await client.set(url, JSON.stringify(data), setOptions);

    logger.debug('RedisProxy [from remote]', { url, REDIS_URI, noCache });
  }

  return data;
}
