import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * OpenSearch Client singleton.
 * @function OpenSearchClient
 * @modules [@opensearch-project/opensearch@^2 pino@^8 pino-pretty@^10]
 * @envs [OPENSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} { OpenSearchClient: "http[s]://[host][:port]" } // the service url
 * @return {promise} the singleton instance
 * @docs https://opensearch.org/docs/latest/clients/javascript/index/
 * @example const data = await (await OpenSearchClient()).search({ ... });
 * @example const client = await OpenSearchClient(); const data = await client.search({ ... });
 * @dockerCompose
  # OpenSearch service
  opensearch:
    image: opensearchproject/opensearch:2
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

let $instance;

export async function OpenSearchClient({ OPENSEARCH_URL } = {}) {

  const logger = await Logger();

  if ($instance) {
    return $instance;
  }

  // imports
  const { Client } = await DynamicImport('@opensearch-project/opensearch@^2');

  // envs
  OPENSEARCH_URL ??= process.env.OPENSEARCH_URL;

  if (!OPENSEARCH_URL) {
    logger.error('OpenSearchClient [missing env]: OPENSEARCH_URL');
  }

  // instance
  $instance = new Client({ node: OPENSEARCH_URL });

  return $instance;

}
