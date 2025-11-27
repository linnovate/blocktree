/**
 * GraphqlClient
 * @function GraphqlClient
 * @modules [pino@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {string} url // see: https://jsonapi.org
 * @param {object} {
 *   query,  // {object} see: https://graphql.org/learn/queries/
 *   variables, // {object}  see: https://graphql.org/learn/queries/#variables
 *   authToken,    // {string} see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization
 * }
 * @return {object} the data
 * @example const data = await GraphqlClient("[host]/graphql", { query: "", variables: {}, authToken: "MY_TOKEN" });
 */
export async function GraphqlClient(url, { query = "", variables = {}, authToken }) {

  /*
   * Imports
   */
  const { FetchClient } = await import('./fetch-client.js');

  /*
   * Return
   */
  return FetchClient(url, {
    logPrefix: "GraphqlClient:",
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Accept": "application/json",
      "Content-type": "application/json",
    },
    body: JSON.stringify({ query, variables })
  });

}
