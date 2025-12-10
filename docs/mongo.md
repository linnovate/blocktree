## Functions

<dl>
<dt><a href="#MongoClient">MongoClient(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Mongo Client - Singleton Mongo Client instance by service URL.</p>
<ul>
<li>Uses default envs: <code>MONGO_URI</code>.</li>
<li>Includes comprehensive logging for request and response cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:MongoClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#MongoIndexerBackups">MongoIndexerBackups(options)</a> ⇒ <code>Promise.&lt;{indices: Array.&lt;string&gt;, actives: Array.&lt;string&gt;}&gt;</code></dt>
<dd><p>Mongo Indexer Backups - Retrieves all indices matching a specific backup pattern for a given alias.</p>
<ul>
<li>Uses default envs: <code>MONGO_URI</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:MongoIndexerBackups</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#MongoIndexerRestore">MongoIndexerRestore(options)</a> ⇒ <code>Promise.&lt;boolean&gt;</code></dt>
<dd><p>Mongo Indexer Restore - Switches the public alias (e.g., &#39;users&#39;) to point to a specific backup timestamp index.</p>
<ul>
<li>Uses default envs: <code>MONGO_URI</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:MongoIndexerRestore</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#MongoIndexer">MongoIndexer(options, batchCallback, testCallback)</a> ⇒ <code>Promise.&lt;{error: (string|boolean)}&gt;</code></dt>
<dd><p>Mongo Indexer - A utility to manage Zero-Downtime indexing (Blue/Green deployment) for Mongo.</p>
<ul>
<li>Uses default envs: <code>MONGO_URI</code>.</li>
<li>Handles Index Rotation: Creates <code>index-name---YYYY.MM.DD_HH-mm-ss</code>.</li>
<li>Manages Aliases: Atomically swaps the alias to the new index.</li>
<li>Cleanup: Removes old indices based on <code>keepAliasesCount</code>.</li>
<li>Bulk Indexing: Batches data efficiently.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:MongoIndexer</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
</dl>

<a name="MongoClient"></a>

## MongoClient(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Mongo Client - Singleton Mongo Client instance by service URL.
- Uses default envs: `MONGO_URI`.
- Includes comprehensive logging for request and response cycles.
- To enable debug logs set env: `DEBUG=blocktree:MongoClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized and connected Mongo client instance, or null on error.  
**Requires**: <code>module:mongodb@^7</code>, <code>module:mongodb-memory-server@^10</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Configuration options. |
| options.MONGO_URI | <code>string</code> | <code>&quot;process.env.MONGO_URI&quot;</code> | Connection string (mongodb://[[username][:password]@][host][:port]). **Required** if `options.mock` is not set. |
| options.mock | <code>boolean</code> | <code>false</code> | If `true`, requires and uses `module:mongodb-memory-server`. [https://www.npmjs.com/package/mongodb-memory-server](https://www.npmjs.com/package/mongodb-memory-server) |
| options.logPrefix | <code>string</code> \| <code>null</code> |  | A string prefix to add to all internal log messages (e.g., `[my-service]`). |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `module:mongodb` options. [https://www.npmjs.com/package/mongodb](https://www.npmjs.com/package/mongodb) |

**Example**  
```js
// Basic Usage
import { MongoClient } from '@linnovate/blocktree';
const mongo = await MongoClient({ MONGO_URI: 'mongodb://root:root@localhost:27017' });
console.log("MongoClient:", await mongo?.db('admin').command({ ping: 1 }) );
```
**Example**  
```js
// Mocking Usage
import { MongoClient } from '@linnovate/blocktree';
const mongo = await MongoClient({ mock: true });
console.log("MongoClient Mocking:", await mongo?.db('admin').command({ ping: 1 }) );
```
**Example**  
```js
# docker-compose.yaml for Mongo
services:
  mongo:
    image: mongo:8-noble
    volumes:
      - ./.mongo:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    ports:
      - 27017:27017
```
<a name="MongoIndexerBackups"></a>

## MongoIndexerBackups(options) ⇒ <code>Promise.&lt;{indices: Array.&lt;string&gt;, actives: Array.&lt;string&gt;}&gt;</code>
Mongo Indexer Backups - Retrieves all indices matching a specific backup pattern for a given alias.
- Uses default envs: `MONGO_URI`.
- To enable debug logs set env: `DEBUG=blocktree:MongoIndexerBackups` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;{indices: Array.&lt;string&gt;, actives: Array.&lt;string&gt;}&gt;</code> - Returns an object containing:
- `indices`: Array of all backup index names sorted by date (descending).
- `actives`: Array of index names that currently have the public alias attached.  
**Requires**: <code>module:mongodb@^7</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Configuration options. |
| options.index | <code>string</code> | The public alias name (e.g., 'users'). |
| ...options | <code>Object</code> \| <code>null</code> | Additional options passed directly to the `MongoClient` factory. |

**Example**  
```js
const { indices, actives } = await MongoIndexerBackups({ index: 'users', MONGO_URI: 'mongodb://root:root@localhost:27017' });
console.log({ indices, actives });
```
<a name="MongoIndexerRestore"></a>

## MongoIndexerRestore(options) ⇒ <code>Promise.&lt;boolean&gt;</code>
Mongo Indexer Restore - Switches the public alias (e.g., 'users') to point to a specific backup timestamp index.
- Uses default envs: `MONGO_URI`.
- To enable debug logs set env: `DEBUG=blocktree:MongoIndexerRestore` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Returns `true` if the restore operation was successful, otherwise `false`.  
**Requires**: <code>module:mongodb@^7</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Configuration options. |
| options.index | <code>string</code> | The public alias name (e.g., 'users'). |
| options.backupIndex | <code>string</code> | The specific index name to restore to (e.g., 'users---2023.01.01...'). Optional if `lastIndexCount` is provided. |
| options.lastIndexCount | <code>string</code> | The offset for the backup to restore (0 = latest, 1 = previous, etc.). Required if `backupIndex` is missing. |
| ...options | <code>Object</code> \| <code>null</code> | Additional options passed directly to the `MongoClient` factory. |

**Example**  
```js
const isDone = await MongoIndexerRestore({ index: 'users', lastIndexCount: 1, MONGO_URI: 'mongodb://root:root@localhost:27017' });
```
<a name="MongoIndexer"></a>

## MongoIndexer(options, batchCallback, testCallback) ⇒ <code>Promise.&lt;{error: (string\|boolean)}&gt;</code>
Mongo Indexer - A utility to manage Zero-Downtime indexing (Blue/Green deployment) for Mongo.
- Uses default envs: `MONGO_URI`.
- Handles Index Rotation: Creates `index-name---YYYY.MM.DD_HH-mm-ss`.
- Manages Aliases: Atomically swaps the alias to the new index.
- Cleanup: Removes old indices based on `keepAliasesCount`.
- Bulk Indexing: Batches data efficiently.
- To enable debug logs set env: `DEBUG=blocktree:MongoIndexer` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;{error: (string\|boolean)}&gt;</code> - Returns `{ error: false }` on success or an object with an error code string.  
**Requires**: <code>module:mongodb@^7</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Configuration options. |
| options.index | <code>string</code> |  | The public alias name (e.g., 'users'). |
| options.mode | <code>&#x27;new&#x27;</code> \| <code>&#x27;clone&#x27;</code> \| <code>&#x27;sync&#x27;</code> | <code>&#x27;new&#x27;</code> | - 'new': Creates a fresh, empty index. - 'clone': Clones the currently active index (fast copy). - 'sync': Updates the currently active index directly (no rotation). |
| options.keyId | <code>string</code> \| <code>null</code> | <code>&quot;&#x27;id&#x27;&quot;</code> | The field name to use as the unique identifier for updates/upserts. |
| options.keepAliasesCount | <code>number</code> | <code>1</code> | Number of past indices to keep before deletion. |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional options passed directly to the `MongoClient` factory. |
| batchCallback | <code>function</code> |  | Async function `({ offset, index, mode, response })`. Should return an Array of objects to index. - Return `[]` or `null` to stop processing. - To delete a doc, include property `{ delete: true }` in the object. - `response` contains the result of the *previous* bulkWrite operation. |
| testCallback | <code>function</code> |  | Async function `({ index, activeIndexName })`. - Runs after indexing but *before* alias swapping. - Return `true` to proceed, or throw/return error to abort |

**Example**  
```js
const result = await MongoIndexer({
    index: 'users',
    MONGO_URI: 'mongodb://root:root@localhost:27017'
  },
  async ({ offset }) => offset == 0 && [{ time: Date.now() }],
);
```
