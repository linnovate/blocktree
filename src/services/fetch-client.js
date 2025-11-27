/**
 * Fetch Client
 * @function FetchClient
 * @modules [pino@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {string} the fetch url
 * @param {null|object} the fetch options
 * @return {promise} the Response with parse data
 * @example const { ok, status, data } = await FetchClient("[host]/api", {});
 */
export async function FetchClient(url, { logPrefix = "", ...options }) {

  /*
   * Imports
   */
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`${logPrefix}FetchClient [request] ${url}`, { ...options });

  /*
   * Return
   */
  return fetch(url, options)
    // server send
    .then(async res => {

      // add data from parse body
      if (res.headers.get("Content-Type")?.includes('json')) {
        res.data = await res.json();
      } else {
        res.data = await res.text();
      }

      // is error
      if (!res.ok) {
        logger.error(`${logPrefix}FetchClient [response] ${url} - ${res.statusText}`, { url, options, status: res.status, statusText: res.statusText });
      }

      logger.debug(`${logPrefix}FetchClient [response] ${url} - ${res.statusText}`, { url, options, status: res.status, statusText: res.statusText });

      // return Response object 
      return res;
    })
    // browser send
    .catch(error => {
      logger.error(`${logPrefix}FetchClient [response]: ${url} - ${error?.message}, cors or network/server is offline.`, { url, options, message: error?.message });

      return {
        ok: false,
        status: null,
        statusText: error.message,
      };
    })
}
