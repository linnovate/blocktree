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
     REDIS_URI,      // {string} redis host (redis[s]://[[username][:password]@][host][:port][/db-number])
     noCache,        // {null|bool} is skip cache
     debug,          // {null|bool} is show logs
     remoteOptions,   // {null|object} the fetch remote options
     sourceCallback, // {null|function} get remote data
   }
 * @return {promise} the data
 * @example const data = await RedisProxy("[host]/api", { debug: true });
 */
export async function RedisProxy(url, { REDIS_URI, noCache, debug, remoteOptions, sourceCallback } = {}) {

  const logger = await Logger();

  const client = await RedisClient({ REDIS_URI });

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


    if (sourceCallback) {
      data = await sourceCallback(url, remoteOptions);
    }
    else {
      const res = await FetchClient(url, remoteOptions);
      data = res.data;
    }

    await client.set(url, JSON.stringify(data));

    debug && logger.info('RedisProxy [from remote]', { url, REDIS_URI, noCache });

  }

  return data;
}
