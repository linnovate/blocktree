/**
 * Elastic Client - Singleton Elastic Client instance by service URL.
 * - This function initializes and returns a singleton instance of an `@elastic/elasticsearch` or `@opensearch-project/opensearch` client.
 * - Uses default envs: `ELASTICSEARCH_URL`.
 * - Includes comprehensive logging for request and response cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:ElasticClient` or `DEBUG=blocktree`
 * 
 * @async
 * @function ElasticClient
 * @requires module:@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3
 * @requires module:@elastic/elasticsearch-mock@^2 (Required if `options.mock` is true)
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object|null} options - Configuration options.
 * @param {string|null} options.ELASTICSEARCH_URL=process.env.ELASTICSEARCH_URL - The service URL (e.g., `http://localhost:9200`). **Required** if `options.mock` is not set.
 * @param {boolean} options.useOpensearch=false - If `true`, requires and uses `module:@opensearch-project/opensearch` instead of Elasticsearch.
 * @param {boolean} options.rejectOnError=false - If `true`, the decorated client will throw an error on a failed request instead of returning `null`.
 * @param {boolean} options.mock=false - If `true`, requires and uses `module:@elastic/elasticsearch-mock`. {@link https://www.npmjs.com/package/@elastic/elasticsearch-mock}
 * @param {string|null} options.logPrefix - A string prefix to add to all internal log messages (e.g., `[my-service]`).
 * @param {Object|null} ...options - Additional standard `module:@elastic/elasticsearch` or `module:@opensearch-project/opensearch` options. {@link https://www.npmjs.com/package/@elastic/elasticsearch} {@link https://www.npmjs.com/package/@opensearch-project/opensearch}
 *
 * @returns {Promise<Object>} The initialized client instance (a standard client object with an optional `mockServer` property).
 *
 * @example
 * // Basic Usage
 * const client = await ElasticClient({ ELASTICSEARCH_URL: 'http://localhost:9200' });
 * console.log( await client.search({}) );
 *
 * @example
 * // Mocking a Response
 * const client = await ElasticClient({ mock: true });
 * client.mockServer.add({ method: 'GET', path: '/article/_search'] }, () => ({ hits: { total: { value: 1}, hits: [{ _index: 'article', _id: '1', _source: { text: 'some text'}}]}}));
 * console.log( await client.search({ index: 'article' }) );
 *
 * @example
# docker-compose.yaml for Elasticsearch
services:
  elastic:
    image: elasticsearch:9.2.1
    volumes:
      - ./.elastic:/usr/share/elasticsearch/data
    environment:
      - 'ES_JAVA_OPTS=-Xms512m -Xmx512m'
      - 'discovery.type=single-node'
      - 'xpack.security.enabled=false'
    ports:
      - 9200:9200
      - 9300:9300
  kibana:
    image: kibana
    ports:
      - 5601:5601
    environment:
      ELASTICSEARCH_HOSTS: "['https://elastic:9200']"
 * @example
# docker-compose.yaml for OpenSearch
services:
  opensearch:
    image: opensearchproject/opensearch:3
    volumes:
      - ./.opensearch:/usr/share/opensearch/data
    environment:
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=Opensearch1!
      - 'OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m'
      - 'discovery.type=single-node'
      - 'DISABLE_SECURITY_PLUGIN=true'
    ports:
      - 9200:9200
      - 9600:9600
  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:latest
    environment:
      OPENSEARCH_HOSTS: "['https://opensearch:9200']"
    ports:
      - 5601:5601
 */

const $instances = {};

export async function ElasticClient({
  ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL,
  useOpensearch = false,
  rejectOnError = false,
  mock = false,
  logPrefix = '',
  ...options
} = {}) {

  // Create a unique key for the singleton based on ELASTICSEARCH_URL or mock
  const instanceKey = mock ? 'mock' : ELASTICSEARCH_URL;
  
  /**
   * Return Singleton if exists
   */
  if ($instances[instanceKey]) {
    return $instances[instanceKey];
  }

  /*
   * Imports
   */
  const sdkModule = useOpensearch ? '@opensearch-project/opensearch@^3' : '@elastic/elasticsearch@^9';
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { Client, Transport } = await DynamicImport(sdkModule);
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Validation
   */
  if (!ELASTICSEARCH_URL && !mock) {
    logger.error(`${logPrefix}ElasticClient [missing env]: ELASTICSEARCH_URL or mock`);
    return false;
  }
  logger.debug(`${logPrefix}ElasticClient [setup] options (path: ${ELASTICSEARCH_URL})`, { namespace: 'ElasticClient', ELASTICSEARCH_URL, useOpensearch, rejectOnError, mock, logPrefix, ...options });
  
  /*
   * Mock Setup
   */
  let $mockServer;
  if (mock) {
    const { default: Mock } = await DynamicImport('@elastic/elasticsearch-mock@^2');
    $mockServer = new Mock();
    
    // Add default mock response for search endpoints
    $mockServer.add(
      { method: 'GET', path: ['/_search', '/:index/_search'] },
      () => ({ hits: { total: { value: 1 }, hits: [{ _index: 'article', _id: '1', _source: { text: 'some text' } }] } })
    );
   
    // Set mock-specific options for the Client constructor
    options || (options = {});
    options.Connection = $mockServer.getConnection();
    options.node = 'http://mock'; // Set a dummy node for mock mode
  }

  /*
   * Logger Transport
   */
  class LoggorTransport extends Transport {
    async request(params, options) {

      const { method, path, querystring } = params;
      logger.debug(`${logPrefix}ElasticClient [request] ${ELASTICSEARCH_URL}${path}`, { namespace: 'ElasticClient', method, path, querystring, options });

      return super.request(params, options)
        .then(res => {
          const hits = res.body?.hits || res.hits;
          const total = hits?.total?.value;
          const _ids = hits?.hits?.map(i => i._id);
          logger.debug(`${logPrefix}ElasticClient [response] ${ELASTICSEARCH_URL}${path}`, { namespace: 'ElasticClient', method, path, querystring, options, 'hits.hits._ids': _ids, 'hits.total.value': total });
          return res
        })
        .catch(res => {
          const errorMsg = res?.meta?.body?.error?.reason || res?.meta?.body?.error || res?.message;
          logger.error(`${logPrefix}ElasticClient [response] ${ELASTICSEARCH_URL}${path} - ${errorMsg}`);
          return rejectOnError ? Promise.reject(res) : null;
        });
    }
  }

  /*
   * Create instance
   */
  $instances[instanceKey] = new Client({
    node: ELASTICSEARCH_URL,
    Transport: LoggorTransport,
    ...options,
  });

  if ($mockServer) {
    // Attach the mock server instance for test setup
    $instances[instanceKey].mockServer = $mockServer;
  }

  logger.info(`${logPrefix}ElasticClient [setup] initialized! (mock: ${!!mock}, useOpensearch: ${!!useOpensearch})`);

  return $instances[instanceKey];

}
