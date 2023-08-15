import { Logger } from '../utils/logger.js';

/**
 * JsonApi client
 * @function JsonApiClient
 * @modules []
 * @envs []
 * @param {string} url // see: https://jsonapi.org
 * @param {object} {
 *   filters,          // {object} see: https://jsonapi.org/format/#query-parameters-families
 *   includes,         // {array}  see: https://jsonapi.org/format/#fetching-includes
 *   offset,           // {number}
 *   limit,            // {number}
 *   authToken, // {string} see: https://jsonapi.org/format/#fetching-includes
 * }
 * @return {object} the data
 * @example const data = await JsonApiClient("[host]/jsonapi/node/article", { filters: { title: "my title" }, includes: ["field_image"] });
 */
export async function JsonApiClient(url, { filters, includes, offset, limit, authToken } = {}) {

  const logger = await Logger();

  // create url params from filters object and includes array
  const urlParams = CreateUrlParams({ filters, includes, offset, limit });

  // send
  return fetch(`${url}?${urlParams}`, {
    method: "GET",
    headers: {
      "Authorization": authToken,
      "Accept": "application/vnd.api+json",
      "Content-type": "application/vnd.api+json",
    },
  })
    .then(res => res.json())
    .then(res => InjectRelationships(res));

};


/**
 * JsonApi client action
 * @function JsonApiClientAction
 * @modules []
 * @envs []
 * @param {string} url // see: https://jsonapi.org
 * @param {object} {
 *   method,    // {string}
 *   body,      // {object} see: https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/creating-new-resources-post#s-basic-post-request
 *   authToken, // {string} see: https://jsonapi.org/format/#fetching-includes
 * }
 * @return {object} the data
 * @example const data = await JsonApiClientAction("[host]/jsonapi/node/article", { method = "POST", body = {}, authToken = "MY_TOKEN" });
 */
export async function JsonApiClientAction(url, { method, body, authToken } = {}) {

  const logger = await Logger();
  
  // send
  return fetch(url, {
    method: method || "POST",
    headers: {
      "Authorization": authToken,
      "Accept": "application/vnd.api+json",
      "Content-type": "application/vnd.api+json",
    },
    body: JSON.stringify(body || {}),
  })
    .then(res => res.json())
    .then(res => {
      if (res.errors) {
        logger.error(`JsonApiClientAction - ${res.errors[0].title}, ${res.errors[0].detail}`)
        return new Error(res.errors[0].title + ", " + res.errors[0].detail);
      }
      return InjectRelationships(res)
    });

};


/*
 * Create url params
 */
export function CreateUrlParams({ filters, includes, offset, limit }) {

  const query = [];

  // create offset query
  if (offset) {
    query.push(`page[offset]=${offset}`);
  }

  // create limit query
  if (limit) {
    query.push(`page[limit]=${limit}`);
  }

  // create filters query [from string]
  if (typeof filters == 'string') {
    query.push(filters);
  }
  // create filters query [from object]
  else if (filters) {
    const searchParams = [];
    Object.keys(filters || {}).forEach(key => searchParams.push(`filter[${key}]=${filters[key]}`));
    query.push(searchParams.join('&'));
  }


  // create includes query [from string]
  if (typeof includes == 'string') {
    query.push(`include=${includes}`);
  }
  // create includes query [from object]
  else if (includes?.length) {
    query.push(`include=${includes.join(',')}`);
  }

  return query.join('&');
}


/*
 * Inject Relationships
 */
export function InjectRelationships(data) {

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
  }

}
