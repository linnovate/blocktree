import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * GraphqlClient
 * @function GraphqlClient
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {string} url // see: https://jsonapi.org
 * @param {object} {
 *   query,  // {object} see: https://graphql.org/learn/queries/
 *   variables, // {object}  see: https://graphql.org/learn/queries/#variables
 *   authToken,    // {string} see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization
 * }
 * @return {object} the data
 * @example const data = await GraphqlClient("[host]/graphql", { query = "", variables = {}, authToken: "MY_TOKEN" });
 */
export async function GraphqlClient(url, { query = "", variables = {}, authToken }) {

  const logger = await Logger();

  // send
  return fetch(url, {
    method: 'POST',
    headers: {
      "Authorization": authToken,
      "Accept": "application/json",
      "Content-type": "application/json",
    },
    body: JSON.stringify({ query, variables })
  })
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
        logger.error('GraphqlClient [server send]', { url, query, variables, status: res.status, statusText: res.statusText });
      }

      // return Response object 
      return res;

    })

    // browser send
    .catch(res => {

      logger.error('GraphqlClient [browser send]: cors or network/server is offline.', { url, message: res.message });

      return {
        ok: false,
        status: null,
        statusText: res.message,
      };

    })

};
