## Functions

<dl>
<dt><a href="#ElasticClient">ElasticClient(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Elastic Client - Singleton Elastic Client instance by service URL.</p>
<ul>
<li>This function initializes and returns a singleton instance of an <code>@elastic/elasticsearch</code> or <code>@opensearch-project/opensearch</code> client.</li>
<li>Uses default envs: <code>ELASTICSEARCH_URL</code>, <code>ELASTICSEARCH_USER</code>, <code>ELASTICSEARCH_PASSWORD</code>.</li>
<li>Includes comprehensive logging for request and response cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:ElasticClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#ElasticIndexerBackups">ElasticIndexerBackups(options)</a> ⇒ <code>Promise.&lt;{indices: Array.&lt;string&gt;, actives: Array.&lt;string&gt;}&gt;</code></dt>
<dd><p>Elastic Indexer Backups - Retrieves all indices matching a specific backup pattern for a given alias.</p>
<ul>
<li>Uses default envs: <code>ELASTICSEARCH_URL</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:ElasticIndexerBackups</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#ElasticIndexerRestore">ElasticIndexerRestore(options)</a> ⇒ <code>Promise.&lt;boolean&gt;</code></dt>
<dd><p>Elastic Indexer Restore - Switches the public alias (e.g., &#39;users&#39;) to point to a specific backup timestamp index.</p>
<ul>
<li>Uses default envs: <code>ELASTICSEARCH_URL</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:ElasticIndexerRestore</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#ElasticIndexer">ElasticIndexer(options, batchCallback, testCallback)</a> ⇒ <code>Promise.&lt;{error: (string|boolean)}&gt;</code></dt>
<dd><p>Elastic Indexer - A utility to manage Zero-Downtime indexing (Blue/Green deployment) for Elasticsearch/OpenSearch.</p>
<ul>
<li>Uses default envs: <code>ELASTICSEARCH_URL</code>.</li>
<li>Handles Index Rotation: Creates <code>index-name---YYYY.MM.DD_HH-mm-ss</code>.</li>
<li>Manages Aliases: Atomically swaps the alias to the new index.</li>
<li>Cleanup: Removes old indices based on <code>keepAliasesCount</code>.</li>
<li>Bulk Indexing: Batches data efficiently.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:ElasticIndexer</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
</dl>

<a name="ElasticClient"></a>

## ElasticClient(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Elastic Client - Singleton Elastic Client instance by service URL.
- This function initializes and returns a singleton instance of an `@elastic/elasticsearch` or `@opensearch-project/opensearch` client.
- Uses default envs: `ELASTICSEARCH_URL`, `ELASTICSEARCH_USER`, `ELASTICSEARCH_PASSWORD`.
- Includes comprehensive logging for request and response cycles.
- To enable debug logs set env: `DEBUG=blocktree:ElasticClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized and connected Mongo client instance, or null on error (a standard client object with an optional `mockServer` property).  
**Requires**: <code>module:@elastic/elasticsearch@^9\|@opensearch-project/opensearch@^3</code>, <code>module:@elastic/elasticsearch-mock@^2</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> \| <code>null</code> |  | Configuration options. |
| options.ELASTICSEARCH_URL | <code>string</code> \| <code>null</code> | <code>&quot;process.env.ELASTICSEARCH_URL&quot;</code> | The service URL (e.g., `http://localhost:9200`). **Required** if `options.mock` is not set. |
| options.ELASTICSEARCH_USER | <code>string</code> \| <code>null</code> | <code>&quot;process.env.ELASTICSEARCH_USER&quot;</code> | The service URL (e.g., `http://localhost:9200`). **Required** if `options.mock` is not set. |
| options.ELASTICSEARCH_PASSWORD | <code>string</code> \| <code>null</code> | <code>&quot;process.env.ELASTICSEARCH_PASSWORD&quot;</code> | The service URL (e.g., `http://localhost:9200`). **Required** if `options.mock` is not set. |
| options.useOpensearch | <code>boolean</code> | <code>false</code> | If `true`, requires and uses `module:@opensearch-project/opensearch` instead of Elasticsearch. |
| options.rejectOnError | <code>boolean</code> | <code>false</code> | If `true`, the decorated client will throw an error on a failed request instead of returning `null`. |
| options.mock | <code>boolean</code> | <code>false</code> | If `true`, requires and uses `module:@elastic/elasticsearch-mock`. [https://www.npmjs.com/package/@elastic/elasticsearch-mock](https://www.npmjs.com/package/@elastic/elasticsearch-mock) |
| options.logPrefix | <code>string</code> \| <code>null</code> |  | A string prefix to add to all internal log messages (e.g., `[my-service]`). |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `module:@elastic/elasticsearch` or `module:@opensearch-project/opensearch` options. [https://www.npmjs.com/package/@elastic/elasticsearch](https://www.npmjs.com/package/@elastic/elasticsearch) [https://www.npmjs.com/package/@opensearch-project/opensearch](https://www.npmjs.com/package/@opensearch-project/opensearch) |

**Example**  
```js
// Basic Usage
import { ElasticClient } from '@linnovate/blocktree';
const elastic = await ElasticClient({ ELASTICSEARCH_URL: 'http://localhost:9200' });
console.log("ElasticClient:", await elastic.search({}) );
```
**Example**  
```js
// Mocking a Response
import { ElasticClient } from '@linnovate/blocktree';
const elastic = await ElasticClient({ mock: true });
elastic.mockServer.add({ method: 'GET', path: '/article/_search' }, () => ({ hits: { total: { value: 1}, hits: [{ _index: 'article', _id: '1', _source: { text: 'some text' }}] }}));
console.log("ElasticClient Mocking:", await elastic.search({ index: 'article' }) );
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

## ElasticIndexerBackups(options) ⇒ <code>Promise.&lt;{indices: Array.&lt;string&gt;, actives: Array.&lt;string&gt;}&gt;</code>
Elastic Indexer Backups - Retrieves all indices matching a specific backup pattern for a given alias.
- Uses default envs: `ELASTICSEARCH_URL`.
- To enable debug logs set env: `DEBUG=blocktree:ElasticIndexerBackups` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;{indices: Array.&lt;string&gt;, actives: Array.&lt;string&gt;}&gt;</code> - Returns an object containing:
- `indices`: Array of all backup index names sorted by date (descending).
- `actives`: Array of index names that currently have the public alias attached.  
**Requires**: <code>module:@elastic/elasticsearch@^9\|@opensearch-project/opensearch@^3</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Configuration options. |
| options.index | <code>string</code> | The public alias name (e.g., 'users'). |
| ...options | <code>Object</code> \| <code>null</code> | Additional options passed directly to the `ElasticClient` factory. [ElasticClient Options Documentation](https://github.com/linnovate/blocktree/blob/v2-dev/docs/elastic.md#ElasticClient) |

**Example**  
```js
const { indices, actives } = await ElasticIndexerBackups({ index: 'users', ELASTICSEARCH_URL: 'http://localhost:9200' });
console.log({ indices, actives });
```
<a name="ElasticIndexerRestore"></a>

## ElasticIndexerRestore(options) ⇒ <code>Promise.&lt;boolean&gt;</code>
Elastic Indexer Restore - Switches the public alias (e.g., 'users') to point to a specific backup timestamp index.
- Uses default envs: `ELASTICSEARCH_URL`.
- To enable debug logs set env: `DEBUG=blocktree:ElasticIndexerRestore` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Returns `true` if the restore operation was successful, otherwise `false`.  
**Requires**: <code>module:@elastic/elasticsearch@^9\|@opensearch-project/opensearch@^3</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Configuration options. |
| options.index | <code>string</code> | The public alias name (e.g., 'users'). |
| options.backupIndex | <code>string</code> | The specific index name to restore to (e.g., 'users---2023.01.01...'). Optional if `lastIndexCount` is provided. |
| options.lastIndexCount | <code>string</code> | The offset for the backup to restore (0 = latest, 1 = previous, etc.). Required if `backupIndex` is missing. |
| ...options | <code>Object</code> \| <code>null</code> | Additional options passed directly to the `ElasticClient` factory. [ElasticClient Options Documentation](https://github.com/linnovate/blocktree/blob/v2-dev/docs/elastic.md#ElasticClient) |

**Example**  
```js
const isDone = await ElasticIndexerRestore({ index: 'users', lastIndexCount: 1, ELASTICSEARCH_URL: 'http://localhost:9200' });
```
<a name="ElasticIndexer"></a>

## ElasticIndexer(options, batchCallback, testCallback) ⇒ <code>Promise.&lt;{error: (string\|boolean)}&gt;</code>
Elastic Indexer - A utility to manage Zero-Downtime indexing (Blue/Green deployment) for Elasticsearch/OpenSearch.
- Uses default envs: `ELASTICSEARCH_URL`.
- Handles Index Rotation: Creates `index-name---YYYY.MM.DD_HH-mm-ss`.
- Manages Aliases: Atomically swaps the alias to the new index.
- Cleanup: Removes old indices based on `keepAliasesCount`.
- Bulk Indexing: Batches data efficiently.
- To enable debug logs set env: `DEBUG=blocktree:ElasticIndexer` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;{error: (string\|boolean)}&gt;</code> - Returns `{ error: false }` on success or an object with an error code string.  
**Requires**: <code>module:@elastic/elasticsearch@^9\|@opensearch-project/opensearch@^3</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Configuration options. |
| options.index | <code>string</code> |  | The public alias name (e.g., 'users'). |
| options.mode | <code>&#x27;new&#x27;</code> \| <code>&#x27;clone&#x27;</code> \| <code>&#x27;sync&#x27;</code> | <code>&#x27;new&#x27;</code> | - 'new': Creates a fresh, empty index. - 'clone': Clones the currently active index (fast copy). - 'sync': Updates the currently active index directly (no rotation). |
| options.keyId | <code>string</code> \| <code>null</code> | <code>&quot;&#x27;id&#x27;&quot;</code> | The field name in the data to use as the document _id. |
| options.keepAliasesCount | <code>number</code> | <code>1</code> | Number of past indices to keep before deletion. |
| options.mappings | <code>Object</code> \| <code>null</code> |  | Elastic index mappings. [https://www.elastic.co/docs/manage-data/data-store/mapping](https://www.elastic.co/docs/manage-data/data-store/mapping) |
| options.settings | <code>Object</code> \| <code>null</code> |  | Elastic index settings. [https://www.elastic.co/docs/reference/elasticsearch/index-settings](https://www.elastic.co/docs/reference/elasticsearch/index-settings) |
| options.bulkOptions | <code>Object</code> \| <code>null</code> |  | Options for bulk operations (e.g., routing, pipeline). [https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference#_bulk](https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference#_bulk) |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional options passed directly to the `ElasticClient` factory. [ElasticClient Options Documentation](https://github.com/linnovate/blocktree/blob/v2-dev/docs/elastic.md#ElasticClient) |
| batchCallback | <code>function</code> |  | Async function `({ offset, index, mode, response })`. Should return an Array of objects to index. - Return `[]` or `null` to stop processing. - To delete a doc, include property `{ delete: true }` in the object. - `response` contains the result of the *previous* bulkWrite operation. |
| testCallback | <code>function</code> |  | Async function `({ index, activeIndexName })`. - Runs after indexing but before alias swapping. - Return `true` to proceed, or throw/return error to abort. |

**Example**  
```js
const result = await ElasticIndexer({
    index: 'users',
    ELASTICSEARCH_URL: 'http://localhost:9200'
  },
  async ({ offset, index, mode, response }) => offset == 0 && [{ time: Date.now() }],
  async ({ index, activeIndexName }) => true,
);
```
