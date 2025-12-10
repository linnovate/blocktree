/**
 * Redis Proxy - A transparent caching wrapper for HTTP requests.
 * - Includes comprehensive logging for request and response cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:RedisProxy` or `DEBUG=blocktree`
 * 
 * @async
 * @function RedisProxy
 * @requires module:redis@^5
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {string} url - The URL to which the request is made.
 * @param {Object|null} fetchOptions - Additional options passed directly to the `FetchClient` factory.
 * @param {Object|null} redisOptions - Additional options passed directly to the `RedisClient` factory.
 *
 * @returns {Promise<Object>} A Promise resolving to a standardized response object: `{ data, ok, status, statusText }`.
 *
 * @example
 * import { RedisProxy } from '@linnovate/blocktree';
 * const { ok, status, data } = await RedisProxy('http://localhost:5000/123', {}, { REDIS_URI: 'redis://localhost:6379/1' });
 * console.log('RedisProxy:', { ok, status, data });
 */
export async function RedisProxy(url, fetchOptions, redisOptions) {

  /*
   * Imports
   */
  const { FetchClient } = await import('../utils/fetch-client.js');
  const { RedisClient } = await import('../services/redis-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`RedisProxy [request] ${url}`, { namespace: 'RedisProxy', url, fetchOptions, redisOptions });
  
  const redisClient = await RedisClient(redisOptions);
 
  /*
   * 1. Attempt to load from Redis
   */
  const resData = await redisClient.json.get(url);
  if (resData) {
    logger.debug(`RedisProxy [response] ${url} - from cache`, { namespace: 'RedisProxy', url, fetchOptions, redisOptions });
    return resData;
  }

  /*
   * 2. Load from Network (Fetch)
   */
  const res = await FetchClient(url, { ...fetchOptions, namespace: 'RedisProxy' });

  /*
   * 3. Cache the result if successful
   */
  if (res?.ok) {
    await redisClient.json.set(url, '$', {
      data: res.data,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
    });
  }
  
  logger.debug(`RedisProxy [response] ${url} - from remote`, { namespace: 'RedisProxy', url, fetchOptions, redisOptions });
 
  return res;
  
}
