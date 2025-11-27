/**
 * Elastic Client singleton.
 * @function ElasticClient
 * @modules [@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3 pino@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
 *   ELASTICSEARCH_URL: "http[s]://[host][:port]", // the elastic service url
 *   mock, // {null|bool} using "@elastic/elasticsearch-mock@^2"
 *   useOpensearch, // {null|bool} using @opensearch-project/opensearch@^3
 *   rejectOnError, // {null|bool}
 *   logPrefix,     // {null|string}
 *   ...options,    // {null|bool} the elastic @elastic/elasticsearch options
 * } 
 * @return {promise} the singleton instance
 * @docs https://www.elastic.co/guide/en/elasticsearch/reference/8.5/elasticsearch-intro.html
 * @docs https://www.npmjs.com/package/@elastic/elasticsearch-mock
 * @example const data = await (await ElasticClient()).search({ ... });
 * @example mock
 * --------
   const client = await ElasticClient({ mock: true });
   client.mockServer.add({ method: 'GET', path: ['/_search', '/:index/_search'] }, () => ({ hits: { total: { value: 1}, hits: [{ _index: "article", _id: "1", _source: { text: "some text"}}]}}));
   const data = await client.search({});
 *
 * @dockerCompose
  # Elastic service
  elastic:
    image: elasticsearch:9.2.1
    volumes:
      - ./.elastic:/usr/share/elasticsearch/data
    environment:
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - "discovery.type=single-node"
      - "xpack.security.enabled=false"
    ports:
      - 9200:9200
      - 9300:9300
  kibana:
    image: kibana
    ports:
      - 5601:5601
    environment:
      ELASTICSEARCH_HOSTS: '["https://elastic:9200"]'
  # OpenSearch service
  opensearch:
    image: opensearchproject/opensearch:3
    volumes:
      - ./.opensearch:/usr/share/opensearch/data
    environment:
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=Opensearch1!
      - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
      - "discovery.type=single-node"
      - "DISABLE_SECURITY_PLUGIN=true"
    ports:
      - 9200:9200
      - 9600:9600
  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:latest
    environment:
      OPENSEARCH_HOSTS: '["https://opensearch:9200"]'
    ports:
      - 5601:5601
 */

const $instances = {};

export async function ElasticClient({
  ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL,
  mock,
  useOpensearch,
  rejectOnError,
  logPrefix = "",
  ...options
} = {}) {

  /*
   * Get instance
   */
  if ($instances[ELASTICSEARCH_URL]) {
    return $instances[ELASTICSEARCH_URL];
  }

  /*
   * Imports
   */
  const sdkModule = useOpensearch ? "@opensearch-project/opensearch@^3" : "@elastic/elasticsearch@^9";
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { Client, Transport } = await DynamicImport(sdkModule);
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Options
   */
  if (!ELASTICSEARCH_URL && !mock) {
    logger.error(`${logPrefix}ElasticClient [missing env]: ELASTICSEARCH_URL || mock`);
    return;
  }
  logger.debug(`${logPrefix}ElasticClient [setup] options (path: ${ELASTICSEARCH_URL})`, { ELASTICSEARCH_URL, mock, useOpensearch, rejectOnError, logPrefix, ...options });

  /*
   * Logger
   */
  class LoggorTransport extends Transport {
    async request(params, options) {

      const { method, path, querystring } = params;
      logger.debug(`${logPrefix}ElasticClient [request] ${ELASTICSEARCH_URL}${path}`, { method, path, querystring, options });

      return super.request(params, options)
        .then(res => {
          const hits = res.body?.hits || res.hits;
          const total = hits?.total?.value;
          const _ids = hits?.hits?.map(i => i._id);
          logger.debug(`${logPrefix}ElasticClient [response] ${ELASTICSEARCH_URL}${path}`, { method, path, querystring, options, "hits.hits._ids": _ids, "hits.total.value": total });
          return res
        })
        .catch(res => {
          const errorMsg = res?.meta?.body?.error?.reason || res?.meta?.body?.error || res?.message;
          logger.error(`${logPrefix}ElasticClient [response] ${ELASTICSEARCH_URL}${path} - ${errorMsg}`, { method, path, querystring, options });
          return rejectOnError ? Promise.reject(res) : null;
        });
    }
  }

  /*
   * Mock
   */
  let $mockServer;
  if (mock) {
    options || (options = {});
    const { default: Mock } = await DynamicImport('@elastic/elasticsearch-mock@^2');
    $mockServer = new Mock();
    $mockServer.add(
      { method: 'GET', path: ['/_search', '/:index/_search'] },
      () => ({
        hits: {
          total: { value: 1 },
          hits: [{ _index: "article", _id: "1", _source: { text: "some text" } }],
        }
      })
    );
    options.Connection = $mockServer.getConnection();
    options.node = "http://mock";
  }

  /*
   * Instance
   */
  $instances[ELASTICSEARCH_URL] = new Client({
    node: ELASTICSEARCH_URL,
    Transport: LoggorTransport,
    ...options,
  });

  if ($mockServer) {
    $instances[ELASTICSEARCH_URL].mockServer = $mockServer;
  }

  logger.info(`${logPrefix}ElasticClient [setup] starting! (mock: ${!!mock}, useOpensearch: ${!!useOpensearch})`);

  return $instances[ELASTICSEARCH_URL];

}
