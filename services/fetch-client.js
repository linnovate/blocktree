import { Logger } from '../utils/logger.js';

/**
 * Fetch Client
 * @function FetchClient
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {string} the fetch url
 * @param {null|object} the fetch options
 * @return {promise} the Response with parse data
 * @example const { ok, status, data } = await FetchClient("[host]/api", {});
 */
export async function FetchClient(url, options = {}) {

  const logger = await Logger();

  // send
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
        logger.error('FetchClient [server send]', { url, options, status: res.status, statusText: res.statusText });
      }

      // return Response object 
      return res;

    })

    // browser send
    .catch(res => {

      logger.error('FetchClient [browser send]: cors or network/server is offline.', { url, options, message: res.message });

      return {
        ok: false,
        status: null,
        statusText: res.message,
      };

    })
}
