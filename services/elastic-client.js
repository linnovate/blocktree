import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Elastic Client singleton.
 * @function ElasticClient
 * @modules [@elastic/elasticsearch@^8 pino@^8 pino-pretty@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
 *   ELASTICSEARCH_URL: "http[s]://[host][:port]", // the elastic service url
 *   mock, // {null|bool} using "@elastic/elasticsearch-mock@^2"
 * } 
 * @return {promise} the singleton instance
 * @docs https://www.elastic.co/guide/en/elasticsearch/reference/8.5/elasticsearch-intro.html
 * @docs https://www.npmjs.com/package/@elastic/elasticsearch-mock
 * @example const data = await (await ElasticClient()).search({ ... });
 * @example const client = await ElasticClient({ mock: true }); client.mockServer.add({ ... }); const data = await client.search({ ... });
 * @dockerCompose
  # Elastic service
  elastic:
    image: elasticsearch:8.5.3
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
 */

let $instance;

let $mockServer;

export async function ElasticClient({ ELASTICSEARCH_URL, mock } = {}, elasticClientOptions = {}) {

  const logger = await Logger();

  if ($instance) {
    return $instance;
  }

  // imports
  const { Client } = await DynamicImport('@elastic/elasticsearch@^8');

  // envs
  ELASTICSEARCH_URL ??= process.env.ELASTICSEARCH_URL;

  if (!ELASTICSEARCH_URL) {
    logger.error('ElasticClient [missing env]: ELASTICSEARCH_URL');
  }

  if (mock) {
    elasticClientOptions || (elasticClientOptions = {});
    const { default: Mock } = await DynamicImport('@elastic/elasticsearch-mock@^2');
    $mockServer = new Mock();
    elasticClientOptions.Connection = $mockServer.getConnection();
  }

  // instance
  $instance = new Client({ node: ELASTICSEARCH_URL, ...elasticClientOptions });

  if ($mockServer) {
    $instance.mockServer = $mockServer;
  }

  return $instance;

}
