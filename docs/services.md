## Functions

<dl>
<dt><a href="#GoogleStorage">GoogleStorage(options)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Google Storage - Singleton Google Storage Client instance.</p>
<ul>
<li>Uses default envs: <code>GOOGLE_STORAGE_CLIENT_EMAIL</code>, <code>GOOGLE_STORAGE_PRIVATE_KEY</code>.</li>
<li>To enable debug logs set env: <code>DEBUG=blocktree:GoogleStorage</code> or <code>DEBUG=blocktree</code></li>
</ul>
</dd>
<dt><a href="#JsonApiClient">JsonApiClient(url, {)</a> ⇒ <code>object</code></dt>
<dd><p>JsonApi client</p>
</dd>
<dt><a href="#JsonApiClientAction">JsonApiClientAction(url, {)</a> ⇒ <code>object</code></dt>
<dd><p>JsonApi client action</p>
</dd>
<dt><a href="#MailerClient">MailerClient({)</a> ⇒ <code>promise</code></dt>
<dd><p>Mailer Client singleton.</p>
</dd>
<dt><a href="#MySqlClient">MySqlClient({)</a> ⇒ <code>promise</code></dt>
<dd><p>MySql Client singleton.</p>
</dd>
<dt><a href="#RabbitmqChannel">RabbitmqChannel(options)</a> ⇒ <code>object</code></dt>
<dd><p>Rabbitmq Channel</p>
</dd>
<dt><a href="#AssertQueue">AssertQueue(queue, handler, options)</a> ⇒ <code>bool</code></dt>
<dd><p>Assert Queue</p>
</dd>
<dt><a href="#SendToQueue">SendToQueue(queue, data, options)</a> ⇒ <code>bool</code></dt>
<dd><p>Send to queue</p>
</dd>
<dt><a href="#RabbitmqClient">RabbitmqClient({)</a> ⇒ <code>promise</code></dt>
<dd><p>Rabbitmq Client singleton.</p>
</dd>
<dt><a href="#RedisClient">RedisClient({)</a> ⇒ <code>promise</code></dt>
<dd><p>Redis Client singleton.</p>
</dd>
<dt><a href="#RedisProxy">RedisProxy(the, the, {)</a> ⇒ <code>promise</code></dt>
<dd><p>Redis Proxy</p>
</dd>
<dt><a href="#S3Storage">S3Storage({)</a> ⇒ <code>promise</code></dt>
<dd><p>S3 Storage singleton.</p>
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
| options | <code>Object</code> \| <code>null</code> |  | Configuration options. |
| options.GOOGLE_STORAGE_CLIENT_EMAIL | <code>string</code> | <code>&quot;process.env.GOOGLE_STORAGE_CLIENT_EMAIL&quot;</code> | The service account email. |
| options.GOOGLE_STORAGE_PRIVATE_KEY | <code>string</code> | <code>&quot;process.env.GOOGLE_STORAGE_PRIVATE_KEY&quot;</code> | The private key (raw or base64 encoded). |
| ...options | <code>Object</code> \| <code>null</code> |  | Additional standard `@google-cloud/storage` options. [https://www.npmjs.com/package/@google-cloud/storage](https://www.npmjs.com/package/@google-cloud/storage) |

**Example**  
```js
const storage = await GoogleStorage();
await storage.bucket('my-bucket').upload('./file.txt');
```
<a name="JsonApiClient"></a>

## JsonApiClient(url, {) ⇒ <code>object</code>
JsonApi client

**Kind**: global function  
**Returns**: <code>object</code> - the data  
**Modules**: [pino@^10]  
**Envs**: [LOG_SERVICE_NAME]  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | // see: https://jsonapi.org |
| { | <code>object</code> | filters,          // {object} see: https://jsonapi.org/format/#query-parameters-families   includes,         // {array}  see: https://jsonapi.org/format/#fetching-includes   offset,           // {number}   limit,            // {number}   authToken, // {string} see: https://jsonapi.org/format/#fetching-includes } |

**Example**  
```js
const data = await JsonApiClient('[host]/jsonapi/node/article', { filters: { title: 'my title' }, includes: ['field_image'] });
```
<a name="JsonApiClientAction"></a>

## JsonApiClientAction(url, {) ⇒ <code>object</code>
JsonApi client action

**Kind**: global function  
**Returns**: <code>object</code> - the data  
**Modules**: [pino@^10 pino-pretty@^13]  
**Envs**: [LOG_SERVICE_NAME]  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | // see: https://jsonapi.org |
| { | <code>object</code> | method,    // {string}   body,      // {object} see: https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/creating-new-resources-post#s-basic-post-request   authToken, // {string} see: https://jsonapi.org/format/#fetching-includes } |

**Example**  
```js
const data = await JsonApiClientAction('[host]/jsonapi/node/article', { method = 'POST', body = {}, authToken = 'MY_TOKEN' });
```
<a name="MailerClient"></a>

## MailerClient({) ⇒ <code>promise</code>
Mailer Client singleton.

**Kind**: global function  
**Returns**: <code>promise</code> - the singleton instance  
**Modules**: [nodemailer@^7 pino@^10]  
**Envs**: [MAILER_HOST, MAILER_USER, MAILER_PESS, LOG_SERVICE_NAME]  
**Docs**: https://nodemailer.com/about  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | MAILER_HOST, MAILER_USER, MAILER_PESS } |

**Example**  
```js
const data = await (await MailerClient()).sendMail({
    from,    // sender address
    to,      // list of receivers
    subject, // subject line
    text,    // plain text body
    html,    // html body
  });
```
<a name="MySqlClient"></a>

## MySqlClient({) ⇒ <code>promise</code>
MySql Client singleton.

**Kind**: global function  
**Returns**: <code>promise</code> - the singleton instance  
**Modules**: [mysql2@^3 pino@^10]  
**Envs**: [MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB, LOG_SERVICE_NAME]  
**Docs**: https://www.npmjs.com/package/mysql2  
**Dockercompose**: # Mysql service
  mysql:
    image: mysql:9
    volumes:
      - ./.mysql:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'
    ports:
      - 3306:3306  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB } |

**Example**  
```js
--------
const client = await MySqlClient({ MYSQL_HOST:  });
const data = await client.query('...', () => {});
```
<a name="RabbitmqChannel"></a>

## RabbitmqChannel(options) ⇒ <code>object</code>
Rabbitmq Channel

**Kind**: global function  
**Returns**: <code>object</code> - channel  
**Modules**: [amqplib@^0.10 pino@^10]  
**Envs**: [RABBITMQ_URI, LOG_SERVICE_NAME]  
**Dockercompose**: # Rabbitmq service
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

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | {   RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port]) } |

**Example**  
```js
RabbitmqChannel();
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

## RabbitmqClient({) ⇒ <code>promise</code>
Rabbitmq Client singleton.

**Kind**: global function  
**Returns**: <code>promise</code> - the singleton instance  
**Modules**: [amqplib@^0.10 pino@^10]  
**Envs**: [RABBITMQ_URI, LOG_SERVICE_NAME]  
**Docs**: https://github.com/amqp-node/amqplib | https://amqp-node.github.io/amqplib/channel_api.html  
**Dockercompose**: # Rabbitmq service
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

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | RABBITMQ_URI: 'amqp://[[username][:password]@][host][:port]' } // the rabbitmq service url |

**Example**  
```js
--------
const rabbitmqClient = await RabbitmqClient({ RABBITMQ_URI: 'amqp://localhost:5672' });
const channel = await rabbitmqClient?.createChannel(); 
await channel?.assertQueue('queue', { durable: false });
channel?.consume('queue', (msg) => console.log(msg?.content.toString()));
channel?.sendToQueue('queue', Buffer.from('something to do'));
```
<a name="RedisClient"></a>

## RedisClient({) ⇒ <code>promise</code>
Redis Client singleton.

**Kind**: global function  
**Returns**: <code>promise</code> - the singleton instance  
**Modules**: [redis@^5 pino@^10]  
**Envs**: [REDIS_URI, LOG_SERVICE_NAME]  
**Docs**: https://www.npmjs.com/package/redis  
**Dockercompose**: # Redis service
  redis:
    image: redis:8-alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | REDIS_URI,    // {string} the redis service uri (redis[s]://[[username][:password]@][host][:port][/db-number])   ...options,   // {null|object} the redis options: https://github.com/redis/node-redis/blob/HEAD/docs/client-configuration.md } |

**Example**  
```js
--------
const redisClient = await RedisClient({ REDIS_URI: 'redis://localhost:6379/1' });
await redisClient.set('key', 'value');      
```
<a name="RedisProxy"></a>

## RedisProxy(the, the, {) ⇒ <code>promise</code>
Redis Proxy

**Kind**: global function  
**Returns**: <code>promise</code> - the data  
**Modules**: [redis@^5 pino@^10 pino-pretty@^13]  
**Envs**: [REDIS_URI, LOG_SERVICE_NAME]  
**Dockercompose**: # Redis service
  redis:
    image: redis:8-alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379  

| Param | Type | Description |
| --- | --- | --- |
| the | <code>string</code> | fetch url |
| the | <code>null</code> \| <code>object</code> | fetch options |
| { | <code>null</code> \| <code>object</code> | REDIS_URI,    // {string} the redis service uri (redis[s]://[[username][:password]@][host][:port][/db-number])      noCache,      // {null|bool} is skip cache      debug,        // {null|bool} is show logs      callback,     // {null|function} get remote data (default: FetchClient)      setOptions,   // {null|object} the redis client.set options (https://redis.io/commands/expire/)      redisOptions, // {null|object} the redis options: https://github.com/redis/node-redis/blob/HEAD/docs/client-configuration.md    } |

**Example**  
```js
--------
const data = await RedisProxy('http://localhost:5000/123', {}, { REDIS_URI: 'redis://localhost:6379/1' });
```
<a name="S3Storage"></a>

## S3Storage({) ⇒ <code>promise</code>
S3 Storage singleton.

**Kind**: global function  
**Returns**: <code>promise</code> - the singleton instance  
**Modules**: [@aws-sdk/client-s3@^3 pino@^10]  
**Envs**: [S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, LOG_SERVICE_NAME]  
**Docs**: https://www.npmjs.com/package/@aws-sdk/client-s3  

| Param | Type | Description |
| --- | --- | --- |
| { | <code>object</code> | S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY } |

**Example**  
```js
const data = await (await S3Storage()).send(command);
```
