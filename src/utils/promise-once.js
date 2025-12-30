/**
 * Promise Once - Prevents multiple concurrent executions of the same asynchronous operation.
 * - Includes comprehensive logging for request and response cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:PromiseOnce` or `DEBUG=blocktree`
 * 
 * @async
 * @function PromiseOnce
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {string} id - A unique identifier for the operation (e.g., 'fetch-user-123').
 * @param {function(): Promise<any>} callback - A function that returns the Promise to be executed if no request is currently pending.
 *
 * @returns {Promise<any>} The result of the callback's promise (or the currently pending one).
 *
 * @example
 * const data = await PromiseOnce('unique-key', async () => {});
 */
const requests = new Map();

export async function PromiseOnce(id, callback) {

  /*
   * Imports
   */
  const logger = await (await import('../utils/logger.js')).Logger();

  // 1. Check if request is already in flight
  if (requests.has(id)) {
    logger.debug(`PromiseOnce [duplicate] (id: ${id})`, { namespace: 'PromiseOnce' });
    return requests.get(id);
  }

  // 2. Execute the callback
  const promise = Promise.try(callback);
  logger.debug(`PromiseOnce [new] (id: ${id})`, { namespace: 'PromiseOnce' });

  // 3. Store the promise in the cache
  requests.set(id, promise);

  // 4. Cleanup: Remove from cache when settled (success or failure)
  promise.finally(() => {
    requests.delete(id);
    logger.debug(`PromiseOnce [clean] (id: ${id})`, { namespace: 'PromiseOnce' });
  });

  return promise;

}
