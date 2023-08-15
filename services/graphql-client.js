import { Logger } from '../utils/logger.js';

/**
 * GraphqlClient
 * @function GraphqlClient
 * @modules []
 * @envs []
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
    .then(res => res.json())

};
