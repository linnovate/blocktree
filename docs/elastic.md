## Functions

<dl>
<dt><a href="#ElasticClient">ElasticClient(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Elastic Client - Singleton Elastic Client instance by service URL.</p>
<ul>
<li>This function initializes and returns a singleton instance of an <code>@elastic/elasticsearch</code> or <code>@opensearch-project/opensearch</code> client.</li>
<li>Uses default envs: <code>ELASTICSEARCH_URL</code>.</li>
<li>Includes comprehensive logging for request and response cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:ElasticClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#ElasticIndexerBackups">ElasticIndexerBackups({)</a> ⇒ <code>object</code></dt>
<dd><p>Elastic Indexer Backups.</p>
</dd>
<dt><a href="#ElasticIndexerRestore">ElasticIndexerRestore({)</a> ⇒ <code>bool</code></dt>
<dd><p>Elastic Indexer Restore.</p>
</dd>
<dt><a href="#ElasticIndexer">ElasticIndexer({, async, async)</a> ⇒ <code>promise:object</code></dt>
<dd><p>Elastic Indexer.</p>
</dd>
</dl>

<a name="ElasticClient"></a>

## ElasticClient(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Elastic Client - Singleton Elastic Client instance by service URL.
- This function initializes and returns a singleton instance of an `@elastic/elasticsearch` or `@opensearch-project/opensearch` client.
- Uses default envs: `ELASTICSEARCH_URL`.
- Includes comprehensive logging for request and response cycles.
- To enable debug logs set env: `DEBUG=blocktree:ElasticClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized client instance (a standard client object with an optional `mockServer` property).  
**Requires**: <code>module:@elastic/elasticsearch@^9\|@opensearch-project/opensearch@^3</code>, <code>module:@elastic/elasticsearch-mock@^2</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> \| <code>null</code> |  | Configuration options. |
| options.ELASTICSEARCH_URL | <code>string</code> \| <code>null</code> | <code>&quot;process.env.ELASTICSEARCH_URL-&quot;</code> | The service URL (e.g., `http://localhost:9200`). **Required** if `options.mock` is not set. |
| options.useOpensearch | <code>boolean</code> | <code>false</code> | If `true`, requires and uses `module:@opensearch-project/opensearch` instead of Elasticsearch. |
| options.rejectOnError | <code>boolean</code> | <code>false</code> | If `true`, the decorated client will throw an error on a failed request instead of returning `null`. |
| options.mock | <code>boolean</code> | <code>false</code> | If `true`, requires and uses `module:@elastic/elasticsearch-mock`. [https://www.npmjs.com/package/@elastic/elasticsearch-mock](https://www.npmjs.com/package/@elastic/elasticsearch-mock) |
| options.logPrefix | <code>string</code> \| <code>null</code> |  | A string prefix to add to all internal log messages (e.g., `[my-service]`). |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `@elastic/elasticsearch@^9` or `@opensearch-project/opensearch@^3` options. [https://www.npmjs.com/package/@elastic/elasticsearch](https://www.npmjs.com/package/@elastic/elasticsearch) [https://www.npmjs.com/package/@opensearch-project/opensearch](https://www.npmjs.com/package/@opensearch-project/opensearch). |

**Example**  
```js
// Basic Usage
const client = await ElasticClient({ ELASTICSEARCH_URL: 'http://localhost:9200' });
console.log( await client.search({}) );
```
**Example**  
```js
// Mocking a Response
const client = await ElasticClient({ mock: true });
client.mockServer.add({ method: 'GET', path: '/article/_search'] }, () => ({ hits: { total: { value: 1}, hits: [{ _index: 'article', _id: '1', _source: { text: 'some text'}}]}}));
console.log( await client.search({ index: 'article' }) );
```
**Example**  
```js
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
```
**Example**  
```js
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
```
<a name="ElasticIndexerBackups"></a>

## ElasticIndexerBackups({) ⇒ <code>object</code>
Elastic Indexer Backups.

**Kind**: global function  
**Returns**: <code>object</code> - { data, actives }  
**Modules**: [@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3 pino@^10]  
**Envs**: [ELASTICSEARCH_URL, LOG_SERVICE_NAME]  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | index,         // {string} the elastic index name      ...options,    // {null|object} the elastic options    } |

**Example**  
```js
const backupsList = await ElasticIndexerBackups({ index, ELASTICSEARCH_URL });
```
<a name="ElasticIndexerRestore"></a>

## ElasticIndexerRestore({) ⇒ <code>bool</code>
Elastic Indexer Restore.

**Kind**: global function  
**Returns**: <code>bool</code> - is done  
**Modules**: [@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3 pino@^10]  
**Envs**: [ELASTICSEARCH_URL, LOG_SERVICE_NAME]  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | index,      // {string}       backupIndex,      // {string}      lastIndexCount: // {number} the count of lasts elastic index      ...options,    // {null|object} the elastic options    } |

**Example**  
```js
const isDone = await ElasticIndexerRestore({ ELASTICSEARCH_URL, aliasName, indexName });
```
<a name="ElasticIndexer"></a>

## ElasticIndexer({, async, async) ⇒ <code>promise:object</code>
Elastic Indexer.

**Kind**: global function  
**Returns**: <code>promise:object</code> - the messages { error: NO_INDEX_NAME || FIND_INDEX_FAILED || INSERT_DATA_FAILED || TEST_DATA_FAILED || UPDATE_ALIASES_FAILED ||REMOVE_OLD_INDICES_FAILED }  
**Modules**: [@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3 pino@^10]  
**Envs**: [ELASTICSEARCH_URL, LOG_SERVICE_NAME]  
**Dockercompose**: # Elastic service
  elastic:
    image: elasticsearch:9.1.5
    volumes:
      - ./.elastic:/usr/share/elasticsearch/data
    environment:
      - 'ES_JAVA_OPTS=-Xms512m -Xmx512m'
      - 'discovery.type=single-node'
      - 'xpack.security.enabled=false'
    ports:
      - 9200:9200
      - 9300:9300  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | ELASTICSEARCH_URL, // the elastic service url (http[s]://[host][:port])      index,      // {string} the elastic alias name      mappings,   // {null|object} the elastic mappings (neets for create/clone index)      settings,   // {null|object} the elastic settings (neets for create/clone index)      bulkOptions,// {null|object} the elastic bulk options (neets for routing and more)      keyId,      // {null|string} the elastic doc key (neets for update a doc) (default: 'id')      mode,       // {null|enum:new,clone,sync} 'new' is using a new empty index, 'clone' is using a clone of the last index, 'sync' is using the current index. (default: 'new')       keepAliasesCount,  // {null|number} how many elastic index passes to save      ...options  // {null|object} the elastic options    } |
| async | <code>function</code> | batchCallback(offset, config, reports) |
| async | <code>function</code> | testCallback(config, reports) |

**Example**  
```js
const reports = await ElasticIndexer(config, async (offset, config, reports) => [], async (config, reports) => true);
```
