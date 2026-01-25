/**
 * Fetch Client - A robust wrapper around the global fetch API
 * - This function performs a network request and automatically parses the response body into a `data` property on the Response object.
 * - Includes comprehensive logging for request and response cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:FetchClient` or `DEBUG=blocktree`
 * 
 * @async
 * @function FetchClient
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {string} url - The URL to which the request is made.
 * @param {Object|null} options - Standard fetch options, extended with custom properties.
 * @param {string|null} options.namespace - A string prefix to add to namespace log messages (e.g., `[my-service]`).
 * @param {string|null} options.logPrefix - A string prefix to add to all internal log messages (e.g., `[my-service]`).
 * @param {Object|null} ...options - Additional standard fetch options (e.g., `method`, `headers`, `body`).
 *
 * @returns {Promise<any>} A Promise that resolves to a standard `Response` object decorated with a `data` property containing the parsed body (JSON or text), or a custom error object on network/CORS failure.
 *
 * @example
 * const { ok, status, data } = await FetchClient('http://localhost:3000/health');
 * console.log({ ok, status, data });
 */
export async function FetchClient(url, {
  namespace = 'FetchClient',
  logPrefix = '',
  ...options
} = {}) {

  /*
   * Imports
   */
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`${logPrefix}FetchClient [request] ${url}`, { namespace, ...options });

  /*
   * Return
   */
  return fetch(url, options)
    // Success: network request completed, process server response
    .then(async res => {

      // add data from parse body
      if (res.headers.get('Content-Type')?.includes('json')) {
        res.data = await res.json();
      } else {
        res.data = await res.text();
      }

      // Log based on response status
      if (!res.ok) {
        logger.error(`${logPrefix}FetchClient [response] ${url} - ${res.statusText}`);
      }
      logger.debug(`${logPrefix}FetchClient [response] ${url} - ${res.statusText}`, { namespace, url, options, status: res.status, statusText: res.statusText });


      // Return decorated Response object
      return res;
    })
    // Failure: network error (e.g., CORS, offline)
    .catch(error => {
      logger.error(`${logPrefix}FetchClient [response] ${url} - ${error?.message}, cors or network/server is offline.`);
      logger.debug(`${logPrefix}FetchClient [response] ${url} - ${error?.message}, cors or network/server is offline.`, { namespace, url, options, message: error?.message });

      // Return a custom error object consistent with the primary return structure
      return {
        ok: false,
        status: null, // Indicates no HTTP status was received
        statusText: error.message,
        data: null,
      };
    })
}
