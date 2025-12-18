/**
 * JsonApi client - Fetches data from a JSON:API compliant endpoint (GET request).
 * - To enable debug logs set env: `DEBUG=blocktree:JsonApiClient` or `DEBUG=blocktree`
 * 
 * @async
 * @function JsonApiClient
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {string} url - The resource URL (e.g., `[host]/jsonapi/node/article`). {@link https://jsonapi.org}
 * @param {Object|null} options - Configuration options.
 * @param {Object.<string, string>|null} options.filters - Key-value pairs for filtering resources. {@link https://jsonapi.org/format/#fetching-filtering}
 * @param {string[]|string} options.includes - Resources to include via the `include` query parameter. {@link https://jsonapi.org/format/#fetching-includes}
 * @param {number|null} options.offset - The offset for pagination.
 * @param {number|null} options.limit - The limit of items to return.
 * @param {string|null} options.authToken - The Bearer token for the Authorization header.
 *
 * @returns {Promise<Object>} A promise resolving to the flattened data object with relationships injected.
 *
 * @example
 * const data = await JsonApiClient('http://localhost:3000/jsonapi/node/article', {
 *   filters: { title: 'my title' },
 *   includes: ['field_image']
 * });
 */
export async function JsonApiClient(url, { filters, includes, offset, limit, authToken } = {}) {

  /*
   * Imports
   */
  const { FetchClient } = await import('../utils/fetch-client.js');

  /*
   * Build query params
   */
  const queryParams = CreateUrlParams({ filters, includes, offset, limit });

  /*
   * Return
   */
  return FetchClient(`${url}?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': authToken,
      'Accept': 'application/vnd.api+json',
      'Content-type': 'application/vnd.api+json',
    },
    namespace: 'JsonApiClient',
  })
    .then(res => {
      res.data = !!res.data && InjectRelationships(res.data)
      return res;
    });
}


/**
 * JsonApi client action - Performs state-changing requests (POST, PATCH, DELETE).
 *
 * @async
 * @function JsonApiClientAction
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {string} url - The resource URL (e.g., `[host]/jsonapi/node/article`). {@link https://jsonapi.org}
 * @param {Object} options - Configuration options.
 * @param {string} options.method='POST' - The HTTP method (POST, PATCH, DELETE).
 * @param {Object} options.body - The payload body. {@link https://jsonapi.org/format/#crud}
 * @param {string|null} options.authToken - The Bearer token for the Authorization header.
 *
 * @return {Promise<Object>} The response data.
 *
 * @example
 * const data = await JsonApiClientAction('/jsonapi/node/article', {
 *   method: 'POST',
 *   body: { data: { type: 'node--article', attributes: { title: 'New Post' } } },
 *   authToken: 'MY_TOKEN'
 * });
 */
export async function JsonApiClientAction(url, {
  method = 'POST',
  body = {},
  authToken
} = {}) {

  /*
   * Imports
   */
  const { FetchClient } = await import('../utils/fetch-client.js');

  /*
   * Return
   */
  return FetchClient(url, {
    method: method || 'POST',
    headers: {
      'Authorization': authToken,
      'Accept': 'application/vnd.api+json',
      'Content-type': 'application/vnd.api+json',
    },
    body: JSON.stringify(body || {}),
    namespace: 'JsonApiClientAction',
  })
    .then(res => {
      res.data = !!res.data && InjectRelationships(res.data)
      return res;
    })
}


/**
 * Helper: Create URL Query Parameters string.
 * Handles JSON:API specific encoding for filters, includes, and pagination.
 *
 * @param {Object} params
 * @param {Object|string} params.filters
 * @param {Array|string} params.includes
 * @param {number} params.offset
 * @param {number} params.limit
 * @returns {string} The constructed query string.
 */
export function CreateUrlParams({ filters, includes, offset, limit }) {

  const query = [];

  // Create offset query
  if (offset) {
    query.push(`page[offset]=${offset}`);
  }

  // Create limit query
  if (limit) {
    query.push(`page[limit]=${limit}`);
  }

  // Create filters query [from string]
  if (typeof filters == 'string') {
    query.push(filters);
  }
  // Create filters query [from object]
  else if (filters) {
    const searchParams = [];
    Object.keys(filters || {}).forEach(key => searchParams.push(`filter[${key}]=${filters[key]}`));
    query.push(searchParams.join('&'));
  }

  // Create includes query [from string]
  if (typeof includes == 'string') {
    query.push(`include=${includes}`);
  }
  // Create includes query [from object]
  else if (includes?.length) {
    query.push(`include=${includes.join(',')}`);
  }

  return query.join('&');
}


/**
 * Helper: Inject Relationships (Deserialize JSON:API).
 * Flattens `relationships` and merges `included` data into the main resource attributes.
 *
 * @param {Object} data - The raw JSON:API response object (containing { data, included }).
 * @returns {Object|Array} The simplified object(s) with relationships resolved.
 */
export function InjectRelationships(data) {

  // Recursive function to resolve relationships for a specific item
  function getRealated(item) {

    const relationships = {};

    Object.keys(item.relationships || {}).map(key => {

      // relationship array
      if (Array.isArray(item.relationships[key].data)) {

        const list = [];

        item.relationships[key].data.forEach(i => {
          // find included item
          const realated = i.id && data.included && data.included.find(include => include.id == i.id);
          if (realated) {
            list.push({ ...realated.attributes, ...getRealated(realated) });
          }
        })

        relationships[key] = list;
      }

      // relationship single
      else {
        const id = item.relationships[key].data?.id;
        // find included item
        const realated = id && data.included && data.included.find(include => include.id == id);
        if (realated) {
          relationships[key] = { ...realated.attributes, ...getRealated(realated) };
        }
      }

    });

    return relationships;
  };

  if (Array.isArray(data?.data)) {
    return data?.data.map(item => ({ ...item.attributes, ...getRealated(item) }));
  } else if (data?.data) {
    return ({ ...data?.data.attributes, ...getRealated(data?.data) });
  } else {
    return data;
  }

}
