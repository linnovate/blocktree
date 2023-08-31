import { RedisClient } from '../services/redis-client.js';
import { FetchClient } from '../services/fetch-client.js';
import { Logger } from '../utils/logger.js';

/**
 * Redis Proxy
 * @function RedisProxy
 * @modules [redis@^4 pino@^8 pino-pretty@^10]
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
 * @example const data = await RedisProxy("[host]/api", {}, { debug: true });
 * @dockerCompose
  # Redis service
  redis:
    image: redis:alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379
 */
export async function RedisProxy(url, fetchOptions, { REDIS_URI, noCache, debug, callback, setOptions, redisOptions } = {}) {

  const logger = await Logger();

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

    debug && logger.info('RedisProxy [from remote]', { url, REDIS_URI, noCache });

  }

  return data;
}
