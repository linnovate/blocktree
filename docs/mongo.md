## Functions

<dl>
<dt><a href="#MongoClient">MongoClient({, MongoClientOptions)</a> ⇒ <code>promise</code></dt>
<dd><p>Mongo Client singleton.</p>
</dd>
<dt><a href="#MongoIndexerBackups">MongoIndexerBackups({)</a> ⇒ <code>object</code></dt>
<dd><p>Mongo Indexer Backups.</p>
</dd>
<dt><a href="#MongoIndexerRestore">MongoIndexerRestore({)</a> ⇒ <code>bool</code></dt>
<dd><p>Mongo Indexer Restore.</p>
</dd>
<dt><a href="#MongoIndexer">MongoIndexer({, async, async)</a> ⇒ <code>promise:object</code></dt>
<dd><p>Mongo Indexer.</p>
</dd>
</dl>

<a name="MongoClient"></a>

## MongoClient({, MongoClientOptions) ⇒ <code>promise</code>
Mongo Client singleton.

**Kind**: global function  
**Returns**: <code>promise</code> - the singleton instance  
**Modules**: [mongodb@^7 pino@^10]  
**Envs**: [MONGO_URI, LOG_SERVICE_NAME]  
**Docs**: https://www.npmjs.com/package/mongodb  
**Dockercompose**: # Mongo service
  mongo:
    image: mongo:8-noble
    volumes:
      - ./.mongo:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    ports:
      - 27017:27017  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | MONGO_URI, {string} the mongo service url (mongodb://[user]:[pass]@[host]:[port]/[db_name]?authSource=admin)   mock, // {null|bool} using 'mongodb-memory-server@^10' } |
| MongoClientOptions | <code>object</code> |  |

**Example**  
```js
const data = await (await MongoClient()).db('...');
```
**Example**  
```js
const client = await MongoClient(); const data = await client.db('...');
```
<a name="MongoIndexerBackups"></a>

## MongoIndexerBackups({) ⇒ <code>object</code>
Mongo Indexer Backups.

**Kind**: global function  
**Returns**: <code>object</code> - { data, actives }  
**Modules**: [mongodb@^7 pino@^10]  
**Envs**: [MONGO_URI, LOG_SERVICE_NAME]  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | index,         // {string} the mongo index name      ...options,    // {null|object} the mongo options    } |

**Example**  
```js
const backupsList = await MongoIndexerBackups({ index });
```
<a name="MongoIndexerRestore"></a>

## MongoIndexerRestore({) ⇒ <code>bool</code>
Mongo Indexer Restore.

**Kind**: global function  
**Returns**: <code>bool</code> - is done  
**Modules**: [mongodb@^7 pino@^10]  
**Envs**: [ELASTICSEARCH_URL, LOG_SERVICE_NAME]  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | index,      // {string}       backupIndex,      // {string}      lastIndexCount: // {number} the count of lasts elastic index      ...options,    // {null|object} the elastic options    } |

**Example**  
```js
const isDone = await MongoIndexerRestore({ index, backupIndex, lastIndexCount });
```
<a name="MongoIndexer"></a>

## MongoIndexer({, async, async) ⇒ <code>promise:object</code>
Mongo Indexer.

**Kind**: global function  
**Returns**: <code>promise:object</code> - the messages { error: NO_INDEX_NAME || FIND_INDEX_FAILED || INSERT_DATA_FAILED || TEST_DATA_FAILED || UPDATE_ALIASES_FAILED ||REMOVE_OLD_INDICES_FAILED }  
**Modules**: [mongodb@^7 pino@^10 pino-pretty@^13]  
**Envs**: [MONGO_URI, LOG_SERVICE_NAME]  
**Dockercompose**: # Mongo service
  mongo:
    image: mongo:8-noble
    volumes:
      - ./.mongo:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    ports:
      - 27017:27017  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | index,  // {null|string} the mongo collection name      keyId,           // {null|string} the mongo doc key      mode,            // {null|enum:new,clone,sync} 'new' is using a new empty index, 'clone' is using a clone of the last index, 'sync' is using the current index. (default: 'new')       keepAliasesCount,  // {null|number} how many index passes to save      options,    } |
| async | <code>function</code> | batchCallback(offset, config, reports) [{ ... , deleted: true }] |
| async | <code>function</code> | testCallback(config, reports) |

**Example**  
```js
const isDone = await MongoIndexer(config, async (offset, config, reports) => [], async (config) => true);
```
