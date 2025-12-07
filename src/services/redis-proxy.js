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
 * const data = await RedisProxy('http://localhost:5000/123', {}, { REDIS_URI: 'redis://localhost:6379/1' });
 * @dockerCompose
  # Redis service
  redis:
    image: redis:8-alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379
 */
export async function RedisProxy(url, fetchOptions, redisOptions) {

  /*
   * Imports
   */
  const { RedisClient } = await import('../services/redis-client.js');
  const { FetchClient } = await import('../utils/fetch-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`RedisProxy [request] ${url}`, { namespace: 'RedisProxy', url, fetchOptions, redisOptions });
  
  const client = await RedisClient(redisOptions);
 
  /*
   * Load from redis
   */
  const resData = await client.json.get(url);
  if (resData) {
    logger.debug(`RedisProxy [response] ${url} - from cache`, { namespace: 'RedisProxy', url, fetchOptions, redisOptions });
    return resData;
  }

  /*
   * Load from fetch
   */
  const res = await FetchClient(url, fetchOptions);
  if (res?.ok) {
    await client.json.set(url, '$', {
      data: res.data,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
    });
  }
  logger.debug(`RedisProxy [response] ${url} - from remote`, { namespace: 'RedisProxy', url, fetchOptions, redisOptions });
 
  return res;
  
}
