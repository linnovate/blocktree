## Functions

<dl>
<dt><a href="#GoogleStorage">GoogleStorage(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Google Storage - Singleton Google Storage Client instance.</p>
<ul>
<li>Uses default envs: <code>GOOGLE_STORAGE_CLIENT_EMAIL</code>, <code>GOOGLE_STORAGE_PRIVATE_KEY</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:GoogleStorage</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#JsonApiClient">JsonApiClient(url, options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>JsonApi client - Fetches data from a JSON:API compliant endpoint (GET request).</p>
<ul>
<li>To enable debug logs set env: <code>DEBUG=blocktree:JsonApiClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#JsonApiClientAction">JsonApiClientAction(url, options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>JsonApi client action - Performs state-changing requests (POST, PATCH, DELETE).</p>
</dd>
<dt><a href="#CreateUrlParams">CreateUrlParams(params)</a> ⇒ <code>string</code></dt>
<dd><p>Helper: Create URL Query Parameters string.
Handles JSON:API specific encoding for filters, includes, and pagination.</p>
</dd>
<dt><a href="#InjectRelationships">InjectRelationships(data)</a> ⇒ <code>Object</code> | <code>Array</code></dt>
<dd><p>Helper: Inject Relationships (Deserialize JSON:API).
Flattens <code>relationships</code> and merges <code>included</code> data into the main resource attributes.</p>
</dd>
<dt><a href="#MailerClient">MailerClient(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Mailer Client - Singleton Nodemailer instance.</p>
<ul>
<li>Uses default envs: <code>MAILER_HOST</code>, <code>MAILER_USER</code>, <code>MAILER_PESS</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#MySqlClient">MySqlClient(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Mailer Client - Singleton Mysql2 instance.</p>
<ul>
<li>Uses default envs: <code>MYSQL_HOST</code>, <code>MYSQL_USER</code>, <code>MYSQL_PASS</code>, <code>MYSQL_DB</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:MySqlClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#RabbitmqChannel">RabbitmqChannel(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Rabbitmq Channel - Singleton Rabbitmq instance.</p>
<ul>
<li>Uses default envs: <code>RABBITMQ_URI</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:RabbitmqChannel</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#AssertQueue">AssertQueue(queue, handler, options)</a> ⇒ <code>bool</code></dt>
<dd><p>Assert Queue</p>
</dd>
<dt><a href="#SendToQueue">SendToQueue(queue, data, options)</a> ⇒ <code>bool</code></dt>
<dd><p>Send to queue</p>
</dd>
<dt><a href="#RabbitmqClient">RabbitmqClient(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Rabbitmq Client - Singleton Rabbitmq instance.</p>
<ul>
<li>Uses default envs: <code>RABBITMQ_URI</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:RabbitmqClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#RedisClient">RedisClient(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Redis Client - Singleton Redis Client instance.</p>
<ul>
<li>Uses default envs: <code>REDIS_URI</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:RedisClient</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#RedisProxy">RedisProxy(url, fetchOptions, redisOptions)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Redis Proxy - A transparent caching wrapper for HTTP requests.</p>
<ul>
<li>Includes comprehensive logging for request and response cycles.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:RedisProxy</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#S3Storage">S3Storage()</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>S3 Storage - singleton.</p>
<ul>
<li>To enable debug logs set env: <code>DEBUG=blocktree:S3Storage</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
</dl>

<a name="GoogleStorage"></a>

## GoogleStorage(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Google Storage - Singleton Google Storage Client instance.
- Uses default envs: `GOOGLE_STORAGE_CLIENT_EMAIL`, `GOOGLE_STORAGE_PRIVATE_KEY`.
- To enable debug logs set env: `DEBUG=blocktree:GoogleStorage` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized Storage instance.  
**Requires**: <code>module:@google-cloud/storage@^7</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Configuration options. |
| options.GOOGLE_STORAGE_CLIENT_EMAIL | <code>string</code> | <code>&quot;process.env.GOOGLE_STORAGE_CLIENT_EMAIL&quot;</code> | The service account email. |
| options.GOOGLE_STORAGE_PRIVATE_KEY | <code>string</code> | <code>&quot;process.env.GOOGLE_STORAGE_PRIVATE_KEY&quot;</code> | The private key (raw or base64 encoded). |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `@google-cloud/storage` options. [https://www.npmjs.com/package/@google-cloud/storage](https://www.npmjs.com/package/@google-cloud/storage) |

**Example**  
```js
const storage = await GoogleStorage({
  GOOGLE_STORAGE_CLIENT_EMAIL: "[some_client_email]",
  GOOGLE_STORAGE_PRIVATE_KEY: "[some_private_key]",
});
await storage.bucket('my-bucket').upload('./file.txt');
```
<a name="JsonApiClient"></a>

## JsonApiClient(url, options) ⇒ <code>Promise.&lt;Object&gt;</code>
JsonApi client - Fetches data from a JSON:API compliant endpoint (GET request).
- To enable debug logs set env: `DEBUG=blocktree:JsonApiClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - A promise resolving to the flattened data object with relationships injected.  
**Requires**: <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | The resource URL (e.g., `[host]/jsonapi/node/article`). [https://jsonapi.org](https://jsonapi.org) |
| options | <code>Object</code> \| <code>null</code> | Configuration options. |
| options.filters | <code>Object.&lt;string, string&gt;</code> \| <code>null</code> | Key-value pairs for filtering resources. [https://jsonapi.org/format/#fetching-filtering](https://jsonapi.org/format/#fetching-filtering) |
| options.includes | <code>Array.&lt;string&gt;</code> \| <code>string</code> | Resources to include via the `include` query parameter. [https://jsonapi.org/format/#fetching-includes](https://jsonapi.org/format/#fetching-includes) |
| options.offset | <code>number</code> \| <code>null</code> | The offset for pagination. |
| options.limit | <code>number</code> \| <code>null</code> | The limit of items to return. |
| options.authToken | <code>string</code> \| <code>null</code> | The Bearer token for the Authorization header. |

**Example**  
```js
const data = await JsonApiClient('http://localhost:5000/jsonapi/node/article', {
  filters: { title: 'my title' },
  includes: ['field_image']
});
```
<a name="JsonApiClientAction"></a>

## JsonApiClientAction(url, options) ⇒ <code>Promise.&lt;Object&gt;</code>
JsonApi client action - Performs state-changing requests (POST, PATCH, DELETE).

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The response data.  
**Requires**: <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| url | <code>string</code> |  | The resource URL (e.g., `[host]/jsonapi/node/article`). [https://jsonapi.org](https://jsonapi.org) |
| options | <code>Object</code> |  | Configuration options. |
| options.method | <code>string</code> | <code>&quot;&#x27;POST&#x27;&quot;</code> | The HTTP method (POST, PATCH, DELETE). |
| options.body | <code>Object</code> |  | The payload body. [https://jsonapi.org/format/#crud](https://jsonapi.org/format/#crud) |
| options.authToken | <code>string</code> \| <code>null</code> |  | The Bearer token for the Authorization header. |

**Example**  
```js
const data = await JsonApiClientAction('/jsonapi/node/article', {
  method: 'POST',
  body: { data: { type: 'node--article', attributes: { title: 'New Post' } } },
  authToken: 'MY_TOKEN'
});
```
<a name="CreateUrlParams"></a>

## CreateUrlParams(params) ⇒ <code>string</code>
Helper: Create URL Query Parameters string.
Handles JSON:API specific encoding for filters, includes, and pagination.

**Kind**: global function  
**Returns**: <code>string</code> - The constructed query string.  

| Param | Type |
| --- | --- |
| params | <code>Object</code> | 
| params.filters | <code>Object</code> \| <code>string</code> | 
| params.includes | <code>Array</code> \| <code>string</code> | 
| params.offset | <code>number</code> | 
| params.limit | <code>number</code> | 

<a name="InjectRelationships"></a>

## InjectRelationships(data) ⇒ <code>Object</code> \| <code>Array</code>
Helper: Inject Relationships (Deserialize JSON:API).
Flattens `relationships` and merges `included` data into the main resource attributes.

**Kind**: global function  
**Returns**: <code>Object</code> \| <code>Array</code> - The simplified object(s) with relationships resolved.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | The raw JSON:API response object (containing { data, included }). |

<a name="MailerClient"></a>

## MailerClient(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Mailer Client - Singleton Nodemailer instance.
- Uses default envs: `MAILER_HOST`, `MAILER_USER`, `MAILER_PESS`.
- To enable debug logs set env: `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized instance.  
**Requires**: <code>module:nodemailer@^7</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Configuration options. |
| ...options | <code>Object</code> \| <code>null</code> | Additional standard `module:nodemailer` options. [https://nodemailer.com/about](https://nodemailer.com/about) |

**Example**  
```js
const storage = await MailerClient();
await storage.bucket('my-bucket').upload('./file.txt');
```
<a name="MySqlClient"></a>

## MySqlClient(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Mailer Client - Singleton Mysql2 instance.
- Uses default envs: `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASS`, `MYSQL_DB`.
- To enable debug logs set env: `DEBUG=blocktree:MySqlClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized MySQL connection or pool instance.  
**Requires**: <code>module:mysql2@^3</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Configuration options. |
| options.MYSQL_HOST | <code>string</code> | <code>&quot;process.env.MYSQL_HOST&quot;</code> | Database host. |
| options.MYSQL_USER | <code>string</code> | <code>&quot;process.env.MYSQL_USER&quot;</code> | Database user. |
| options.MYSQL_PASS | <code>string</code> | <code>&quot;process.env.MYSQL_PASS&quot;</code> | Database password. |
| options.MYSQL_DB | <code>string</code> | <code>&quot;process.env.MYSQL_DB&quot;</code> | Database name. |
| options.usePool | <code>boolean</code> | <code>false</code> | If true, creates a connection pool instead of a single connection. |
| options.logPrefix | <code>string</code> |  | Prefix for log messages. |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `module:mysql2` options. [https://www.npmjs.com/package/mysql2](https://www.npmjs.com/package/mysql2) |

**Example**  
```js
const client = await MySqlClient({ MYSQL_HOST: 'localhost', MYSQL_DB: 'my_app' });
const [rows] = await client.query('SELECT * FROM users WHERE id = ?', [1]);
```
**Example**  
```js
# docker-compose.yaml for Mysql
services:
  mysql:
    image: mysql:9
    volumes:
      - ./.mysql:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'
    ports:
      - 3306:3306
```
<a name="RabbitmqChannel"></a>

## RabbitmqChannel(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Rabbitmq Channel - Singleton Rabbitmq instance.
- Uses default envs: `RABBITMQ_URI`.
- To enable debug logs set env: `DEBUG=blocktree:RabbitmqChannel` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized MySQL connection or pool instance.  
**Requires**: <code>module:amqplib@^0.10</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Configuration options. |
| options.RABBITMQ_URI | <code>string</code> | <code>&quot;process.env.RABBITMQ_URI&quot;</code> | Connection string (amqp://[[username][:password]@][host][:port]). |
| options.logPrefix | <code>string</code> |  | Prefix for log messages. |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `module:amqplib` options. [https://www.npmjs.com/package/amqplib](https://www.npmjs.com/package/amqplib) |

**Example**  
```js
const channel = await RabbitmqChannel();
const [rows] = await client.query('SELECT * FROM users WHERE id = ?', [1]);
```
**Example**  
```js
# docker-compose.yaml for Rabbitmq
services:
  rabbitmq:
    image: rabbitmq:4
    environment:
      RABBITMQ_DEFAULT_USER: root
      RABBITMQ_DEFAULT_PASS: root
    ports:
      - 5672:5672
      - 15672:15672
    volumes:
      - ./rabbitmq:/var/lib/rabbitmq
```
<a name="AssertQueue"></a>

## AssertQueue(queue, handler, options) ⇒ <code>bool</code>
Assert Queue

**Kind**: global function  
**Modules**: [amqplib@^0.10 pino@^10]  
**Envs**: [RABBITMQ_URI, LOG_SERVICE_NAME]  

| Param | Type | Description |
| --- | --- | --- |
| queue | <code>string</code> |  |
| handler | <code>function</code> |  |
| options | <code>object</code> | {      RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])    } |

**Example**  
```js
AssertQueue('update_item', (data) => { console.log(data) });
```
<a name="SendToQueue"></a>

## SendToQueue(queue, data, options) ⇒ <code>bool</code>
Send to queue

**Kind**: global function  
**Modules**: [amqplib@^0.10 pino@^10]  
**Envs**: [RABBITMQ_URI, LOG_SERVICE_NAME]  

| Param | Type | Description |
| --- | --- | --- |
| queue | <code>string</code> |  |
| data | <code>object</code> |  |
| options | <code>object</code> | {      RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])    } |

**Example**  
```js
SendToQueue('update_item', {});
```
<a name="RabbitmqClient"></a>

## RabbitmqClient(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Rabbitmq Client - Singleton Rabbitmq instance.
- Uses default envs: `RABBITMQ_URI`.
- To enable debug logs set env: `DEBUG=blocktree:RabbitmqClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized Rabbitmq Connection instance.  
**Requires**: <code>module:amqplib@^0.10</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Configuration options. |
| options.RABBITMQ_URI | <code>string</code> | <code>&quot;process.env.RABBITMQ_URI&quot;</code> | Connection string (amqp://[[username][:password]@][host][:port]). |
| options.logPrefix | <code>string</code> |  | Prefix for log messages. |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `module:amqplib` options. [https://www.npmjs.com/package/amqplib](https://www.npmjs.com/package/amqplib) |

**Example**  
```js
const connection = await RabbitmqClient({ RABBITMQ_URI: 'amqp://localhost:5672' });
const channel = await connection?.createChannel(); 
await channel?.assertQueue('queue', { durable: false });
channel?.consume('queue', (msg) => console.log(msg?.content.toString()));
channel?.sendToQueue('queue', Buffer.from('something to do'));
```
**Example**  
```js
# docker-compose.yaml for Rabbitmq
services:
  rabbitmq:
    image: rabbitmq:4
    environment:
      RABBITMQ_DEFAULT_USER: root
      RABBITMQ_DEFAULT_PASS: root
    ports:
      - 5672:5672
      - 15672:15672
    volumes:
      - ./rabbitmq:/var/lib/rabbitmq
```
<a name="RedisClient"></a>

## RedisClient(options) ⇒ <code>Promise.&lt;Object&gt;</code>
Redis Client - Singleton Redis Client instance.
- Uses default envs: `REDIS_URI`.
- To enable debug logs set env: `DEBUG=blocktree:RedisClient` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - The initialized Redis Connection instance.  
**Requires**: <code>module:redis@^5</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Configuration options. |
| options.REDIS_URI | <code>string</code> | <code>&quot;process.env.REDIS_URI&quot;</code> | Connection string (redis[s]://[[username][:password]@][host][:port][/db-number]). |
| options.logPrefix | <code>string</code> \| <code>null</code> |  | A string prefix to add to all internal log messages (e.g., `[my-service]`). |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `module:redis` options. [https://www.npmjs.com/package/redis](https://www.npmjs.com/package/redis) |

**Example**  
```js
const redisClient = await RedisClient({ REDIS_URI: 'redis://localhost:6379/1' });
await redisClient.set('key', 'value');  
```
**Example**  
```js
const storage = await RedisClient();
await storage.bucket('my-bucket').upload('./file.txt');
```
**Example**  
```js
# docker-compose.yaml for Redis
services:
  redis:
    image: redis:8-alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379
```
<a name="RedisProxy"></a>

## RedisProxy(url, fetchOptions, redisOptions) ⇒ <code>Promise.&lt;Object&gt;</code>
Redis Proxy - A transparent caching wrapper for HTTP requests.
- Includes comprehensive logging for request and response cycles.
- To enable debug logs set env: `DEBUG=blocktree:RedisProxy` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - A Promise resolving to a standardized response object: `{ data, ok, status, statusText }`.  
**Requires**: <code>module:redis@^5</code>, <code>module:pino@^10</code>  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | The URL to which the request is made. |
| fetchOptions | <code>Object</code> \| <code>null</code> | Additional options passed directly to the `FetchClient` factory. |
| redisOptions | <code>Object</code> \| <code>null</code> | Additional options passed directly to the `RedisClient` factory. |

**Example**  
```js
const data = await RedisProxy('http://localhost:5000/123', {}, { REDIS_URI: 'redis://localhost:6379/1' });
```
<a name="S3Storage"></a>

## S3Storage() ⇒ <code>Promise.&lt;Object&gt;</code>
S3 Storage - singleton.
- To enable debug logs set env: `DEBUG=blocktree:S3Storage` or `DEBUG=blocktree`

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - A promise resolving to the S3Client singleton instance.  
**Requires**: <code>module:@aws-sdk/client-s3@^3</code>, <code>module:pino@^10</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options.S3_BUCKET | <code>string</code> |  | The S3 bucket name (validated but not attached to client). |
| options.S3_REGION | <code>string</code> |  | The AWS region. |
| options.S3_ACCESS_KEY | <code>string</code> |  | The AWS access key ID. |
| options.S3_SECRET_KEY | <code>string</code> |  | The AWS secret access key. |
| options.logPrefix | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | Optional prefix for log messages. |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `module:@aws-sdk/client-s3` options. [https://www.npmjs.com/package/@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3) |

**Example**  
```js
const client = await S3Storage();
```
