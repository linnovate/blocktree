/**
 * Graphql Client - Executes a GraphQL operation (Query/Mutation) via HTTP POST.
 * - Includes comprehensive logging for request and response cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:GraphqlClient` or `DEBUG=blocktree`
 * 
 * @async
 * @function GraphqlClient
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {string} url - The GraphQL endpoint URL.
 * @param {Object} options - GraphQL request options.
 * @param {string} options.query - The GraphQL query or mutation string. {@link https://graphql.org/learn/queries}
 * @param {Object|null} options.variables - The variables object to accompany the query. {@link https://graphql.org/learn/queries/#variables}
 * @param {string|null} options.authToken - The value for the `Authorization` header (e.g., "Bearer <token>"). {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization}
 * @param {Object|null} ...options - Additional standard fetch options (e.g., `headers`, `cors`).

 * @returns {Promise<Object>} The Fetch Response object (populated with a parsed `.data` property by FetchClient).
 *
 * @example
 * import { GraphqlClient } from '@linnovate/blocktree';
 * const { ok, status, data } = await GraphqlClient('http://localhost:3000/graphql', { query: '{health}', variables: {}, authToken: 'MY_TOKEN' })
 * console.log('GraphqlClient:', { ok, status, data });
 */
export async function GraphqlClient(url, { query = '', variables = {}, authToken, ...options } = {}) {

  /*
   * Imports
   */
  const { FetchClient } = await import('../utils/fetch-client.js');

  /*
   * Return
   */
  return FetchClient(url, {
    ...options,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-type': 'application/json',
      ...(options?.headers || {}),
      ...(authToken ? { 'Authorization': authToken } :  {}),
    },
    body: JSON.stringify({ query, variables }),
    namespace: 'GraphqlClient',
  });

}
