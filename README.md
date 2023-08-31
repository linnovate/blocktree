# Blocktree core
Tools for developers, to build services with a uniform standard (node_modules/envs/logs).

---

## Install module
```bash
npm install @linnovate/blocktree
```

---

## API

> [Basic server](#server)

> [Infrastructures](#infrastructures)
 - [Security Express](#security-express)
 - [Graphql Express](#graphql-express)

> [Tools](#tools)
 - [JWT Parser](#jwt-parser)
 - [AutoLoad](#autoLoad)
 - [Elastic Indexer](#elastic-indexer)
 - [Mongo Indexer](#mongo-indexer)
 - [Rabbitmq Channel](#rabbitmq-channel)
 - [Redis Proxy](#redis-proxy)

> [Utils](#utils)
 - [Logger](#logger)

> [Services: Databases](#services-databases)
 - [Elastic Client](#elastic-client)
 - [Mongo Client](#mongo-client)
 - [MySql Client](#mysql-client)
 - [Redis Client](#redis-client)
 - [Rabbitmq Client](#rabbitmq-client)

> [Services: Api](#services-api)
 - [Fetch Client](#fetch-client)
 - [Graphql Client](#graphql-client)
 - [JsonApi Client](#jsonapi-client)
 - [Google Storage](#google-storage)
 - [S3 Storage](#s3-storage)

> [Services: Handlers](#services-handlers)
 - [Mailer Client](#mailer-client)


### Setup server
---

```js
import express from 'express';
const app = express();
const server = app.listen(5000, () => console.log(`Example app listening on port 5000!`));
```

### Infrastructures
---
#### Security Express
```js
/**
 * Security Express
 * @function SecurityExpress
 * @modules [compression@^1 helmet@^7 cors@^2]
 * @envs []
 * @param {object} the express app
 * @param {object} {
 *   corsOptions,   // see: https://www.npmjs.com/package/cors#configuring-cors 
 *   helmetOptions, // see: https://www.npmjs.com/package/helmet
 * }
 * @return {object} the express router
 */
SecurityExpress(app, { corsOptions, helmetOptions } = {});
```

#### Graphql Express
```js
/**
 * Graphql Express
 * @function GraphqlExpress
 * @modules [graphql graphql-yoga@^4 ws@^8 graphql-ws@^5]
 * @envs []
 * @param {object} the express app
 * @param {array} [{
 *   directives: [{
 *     typeDefs: String,      // see: https://spec.graphql.org/draft/#sec-Type-System.Directives
 *     transformer: Function, // see: https://the-guild.dev/graphql/tools/docs/schema-directives#implementing-schema-directives
 *   }]
 *   typeDefs,    // see: https://graphql.org/learn/schema
 *   resolvers,   // see: https://graphql.org/learn/execution
 * }]
 * @param {object} the options {
 *   serverWS,    // the express server
 *   yogaOptions, // see: https://the-guild.dev/graphql/yoga-server/docs
 * }
 * @return {object} express app.next()
 *
 * @example setup Graphql:
   ---------------
   import express from 'express';
   const app = express();
   const server = app.listen(5000);
   GraphqlExpress(app, [{ typeDefs: '', resolvers: {} }], { serverWS: server, yogaOptions: {} });
 *	 
 * @example server WebSocket:
   ---------------------------
   const { createPubSub } = await import('graphql-yoga');
   const pubSub = createPubSub();
   export default {
     Mutation: {
       test: () => pubSub.publish("MY_TEST", { test: true }),
     },
     Subscription: {
       test: {
         subscribe: () => pubsub.subscribe("MY_TEST"),
       }
     }
   }
 *
 * @example client WebSocket:
   ---------------------------
   import { createClient } from 'graphql-ws';
   const client = createClient({ url: 'ws://localhost:5000/graphql' });

   const unsubscribe = client.subscribe({
     query: 'subscription { test }',
   },{
     next: (data) => console.log("next:", data),
     error: (data) => console.log("error:", data),
     complete: (data) => console.log("complete:", data),
   });
*/
GraphqlExpress(app, [{ typeDefs: '', resolvers: {} }], { serverWS: server, yogaOptions: {} });
// using AutoLoad
AutoLoad(["typeDefs", "directives", "resolvers"]).then(schemas => {
  GraphqlExpress(app, schemas, { serverWS: server, yogaOptions: {} });
});
```

### Tools
---

#### JWT Parser
```js
/**
 * JWT Parser
 * @function JWTParser
 * @modules [jsonwebtoken@^8 pino@^8 pino-pretty@^10]
 * @envs [JWT_SECRET_KEY, LOG_SERVICE_NAME]
 * @param {string} token
 * @param {string} JWT_SECRET_KEY
 * @param {array} algorithms (default: ['RS256'])
 * @return {promise} the jwt parsing
 * @docs https://www.npmjs.com/package/jsonwebtoken
 */
const data = await JWTParser(token);
```

#### AutoLoad
```js
/**
 * AutoLoad es6 modules from a dirs list
 * @function AutoLoad
 * @modules []
 * @envs []
 * @param {array} dirs - ["typeDefs", "directives", "resolvers"]
 * @param {string} baseUrl - "src"
 * @return {object} the modules
 * @example const { typeDefs, directives, resolvers } = await AutoLoad(["typeDefs", "directives", "resolvers"]);
 */
const { typeDefs, directives, resolvers } = await AutoLoad(["typeDefs", "directives", "resolvers"]);
```

#### Elastic Indexer
```js
/**
 * Elastic Indexer.
 * @function ElasticIndexer
 * @modules [@elastic/elasticsearch@^8 pino@^8 pino-pretty@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic service url (http[s]://[host][:port])
     index,      // {string} the elastic alias name
     mappings,   // {null|object} the elastic mappings (neets for create/clone index)
     settings,   // {null|object} the elastic settings (neets for create/clone index)
     bulk,       // {null|object} the elastic bulk options (neets for routing and more)
     keyId,      // {null|string} the elastic doc key (neets for update a doc)
     updateOnly, // {bool} update parts of items (using a clone index)
     syncOnly,   // {bool} update parts of items (using the same index)
     keepAliasesCount,  // {null|number} how many elastic index passes to save
   }
 * @param {function} async batchCallback(offset, config)
 * @param {function} async testCallback(config)
 * @return {bool} is done
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
 */
const isDone = await ElasticIndexer({ index: "my_name", mappings: {}, settings: {} }, (offset, config) => [], (config) => true);
```
```js
/**
 * Restore Elastic Indexer.
 * @function RestoreElasticIndexer
 * @modules [@elastic/elasticsearch@^8 pino@^8 pino-pretty@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic service url (http[s]://[host][:port])
     aliasName,      // {string} the elastic alias name
     indexName,      // {string} the elastic index name
   }
 * @param {function} async testCallback(config)
 * @return {bool} is done
 */
const isDone = await RestoreElasticIndexer({ ELASTICSEARCH_URL, aliasName, indexName }, async (config) => true);
```

#### Mongo Indexer
```js
/**
 * Mongo Indexer.
 * @function MongoIndexer
 * @modules [mongodb@^5 mongoose@^7 pino@^8 pino-pretty@^10]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} {
     MONGO_URI,       // the mongo service uri (mongodb://[host]:[port])
     usingMongoose,   // {null|bool} is use mongoose schemas
     modelName,       // {null|string} the mongoose model name
     collectionName,  // {null|string} the mongo collection name
     keyId,           // {null|string} the mongo doc key
     disconnectMongo, // {null|bool} is disconnect mongo
   }
 * @param {function} async batchCallback(offset, config) [{ ... , deleted: true }]
 * @param {function} async testCallback(config)
 * @return {promise} is done
 * @dockerCompose
  # Mongo service
  mongo:
    image: mongo:alpine
    volumes:
      - ./.mongo:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    ports:
      - 27017:27017
 * */
const isDone = await MongoIndexer({ MONGO_URI, usingMongoose: true, modelName: "Article", collectionName: "articles" }, async (offset, config) => [], async (config) => true);
```

#### Rabbitmq Channel
```js
/**
 * Assert Queue
 * @function AssertQueue
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [REBBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {function} handler
 * @param {object} options {
     REBBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])
   }
 * @return 
 * @dockerCompose
  # Rabbitmq service
  rabbitmq:
    image: rabbitmq:alpine
    environment:
      RABBITMQ_DEFAULT_USER: root
      RABBITMQ_DEFAULT_PASS: root
    ports:
      - 5672:5672
 */
AssertQueue('update_item', (data) => { console.log(data) });

/**
 * Send to queue
 * @function SendToQueue
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [REBBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {object} data
 * @param {object} options {
     REBBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])
   }
 * @return 
 */
SendToQueue('update_item', {});
```

#### Redis Proxy
```js
/**
 * Redis Proxy
 * @function RedisProxy
 * @modules [redis@^4 pino@^8 pino-pretty@^10]
 * @envs [REDIS_URI, LOG_SERVICE_NAME]
 * @param {string} the fetch url
 * @param {null|object} the fetch options
 * @param {null|object} {
     REDIS_URI, // {string} the redis service uri (redis[s]://[[username][:password]@][host][:port][/db-number])
     noCache,   // {null|bool} is skip cache
     debug,     // {null|bool} is show logs
     callback,  // {null|function} get remote data (default: FetchClient)
     setOptions, // {null|object} the redis client.set options (https://redis.io/commands/expire/)
   }
 * @return {promise} the data
 * @dockerCompose
  # Redis service
  redis:
    image: redis:alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379
 */
const data = await RedisProxy("[host]/api", {}, { debug: true });
```

### Utils
---

#### Logger
```js
/**
 * Logger.
 * @function Logger
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {object} { LOG_SERVICE_NAME }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/pino
 */
(await Logger()).log('...', '...');
Logger().then(logger => { logger.log('...', '...'); });
const logger = await Logger();
logger.log('...', '...');
```

### Services: Databases
---

#### Elastic Client
```js
/**
 * Elastic Client singleton.
 * @function ElasticClient
 * @modules [@elastic/elasticsearch@^8 pino@^8 pino-pretty@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} { ELASTICSEARCH_URL: "http[s]://[host][:port]" } // the elastic service url
 * @return {promise} the singleton instance
 * @docs https://www.elastic.co/guide/en/elasticsearch/reference/8.5/elasticsearch-intro.html
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
 */
const data = await (await ElasticClient()).search({ ... });
const client = await ElasticClient();
const data = await client.search({ ... });
```

#### Mongo Client
```js
/**
 * Mongo Client singleton.
 * @function MongoClient
 * @modules [mongodb@^5 pino@^8 pino-pretty@^10]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {string} MONGO_URI the mongo service uri (mongodb://[host]:[port])
 * @param {object} MongoClientOptions
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mongodb
 * @dockerCompose
  # Mongo service
  mongo:
    image: mongo:alpine
    volumes:
      - ./.mongo:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    ports:
      - 27017:27017
 */
const data = await (await MongoClient()).db('...');
const mongo = await MongoClient();
const data = await mongo.db('...');
```

#### MySql Client
```js
/**
 * MySql Client singleton.
 * @function MySqlClient
 * @modules [mysql2@^3 pino@^8 pino-pretty@^10]
 * @envs [MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB, LOG_SERVICE_NAME]
 * @param {object} { MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mysql2
 * @dockerCompose
  # Mysql service
  mysql:
    image: mysql:8
    volumes:
      - ./.mysql:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'
    ports:
      - 3306:3306
 */
const data = await (await MySqlClient()).query('...', () => {});
```

#### Redis Client
```js
/**
 * Redis Client singleton.
 * @function RedisClient
 * @modules [redis@^4 pino@^8 pino-pretty@^10]
 * @envs [REDIS_URI, LOG_SERVICE_NAME]
 * @param {object} {
    REDIS_URI,    // {string} the redis service uri (redis[s]://[[username][:password]@][host][:port][/db-number])
    ...options,   // {null|object} the redis options: https://github.com/redis/node-redis/blob/HEAD/docs/client-configuration.md
   }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/redis
 * @dockerCompose
  # Redis service
  redis:
    image: redis:alpine
    volumes:
      - ./.redis:/data
    ports:
      - 6379:6379
 */
const data = await (await RedisClient()).set('key', 'value');
```

### Services: Apis
---

#### Fetch Client
```js
/**
 * Fetch Client
 * @function FetchClient
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {string} the fetch url
 * @param {null|object} the fetch options
 * @return {promise} the Response with parse data
 * @example const { ok, status, data } = await FetchClient("[host]/api", {});
 */
const { ok, status, data } = await FetchClient("[host]/api", {});
```

#### Graphql Client
```js
/**
 * GraphqlClient
 * @function GraphqlClient
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {string} url // see: https://jsonapi.org
 * @param {object} {
 *   query,  // {object} see: https://graphql.org/learn/queries/
 *   variables, // {object}  see: https://graphql.org/learn/queries/#variables
 *   authToken,    // {string} see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization
 * }
 * @return {object} the data
 */
const data = await GraphqlClient("[host]/graphql", { query = "", variables = {}, authToken: "MY_TOKEN" });
```

#### JsonApi Client
```js
/**
 * JsonApi client
 * @function JsonApiClient
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {string} url // see: https://jsonapi.org
 * @param {object} {
 *   filters,          // {object} see: https://jsonapi.org/format/#query-parameters-families
 *   includes,         // {array}  see: https://jsonapi.org/format/#fetching-includes
 *   offset,           // {number}
 *   limit,            // {number}
 *   authToken, // {string} see: https://jsonapi.org/format/#fetching-includes
 * }
 * @return {object} the data
 */
const data = await JsonApiClient("[host]/jsonapi/node/article", { filters: { title: "my title" }, includes: ["field_image"] });

/**
 * JsonApi client action
 * @function JsonApiClientAction
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {string} url // see: https://jsonapi.org
 * @param {object} {
 *   method,    // {string}
 *   body,      // {object} see: https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/creating-new-resources-post#s-basic-post-request
 *   authToken, // {string} see: https://jsonapi.org/format/#fetching-includes
 * }
 * @return {object} the data
 */
const data = await JsonApiClientAction("[host]/jsonapi/node/article", { method = "POST", body = {}, authToken = "MY_TOKEN" });
```

#### Google Storage
```js
/**
 * Google Storage singleton.
 * @function GoogleStorage
 * @modules [@google-cloud/storage@^7 pino@^8 pino-pretty@^10]
 * @envs [GOOGLE_STORAGE_CLIENT_EMAIL, GOOGLE_STORAGE_PRIVATE_KEY, LOG_SERVICE_NAME]
 * @param {object} { GOOGLE_STORAGE_CLIENT_EMAIL, GOOGLE_STORAGE_PRIVATE_KEY }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/@google-cloud/storage
 */
const data = await (await GoogleStorage()).bucket({ ... });
```

#### S3 Storage
```js
/**
 * S3 Storage singleton.
 * @function S3Storage
 * @modules [@aws-sdk/client-s3@^3 pino@^8 pino-pretty@^10]
 * @envs [S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, LOG_SERVICE_NAME]
 * @param {object} { S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/@aws-sdk/client-s3
 */
const data = await (await S3Storage()).send(command);
```

### Services: Handlers
---

#### Rabbitmq Client
```js
/**
 * Rabbitmq Client singleton.
 * @function RabbitmqClient
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [REBBITMQ_URI, LOG_SERVICE_NAME]
 * @param {object} { REBBITMQ_URI: "amqp://[[username][:password]@][host][:port]" } // the rabbitmq service url 
 * @return {promise} the singleton instance
 * @docs https://github.com/amqp-node/amqplib
 * @dockerCompose
  # Rabbitmq service
  rabbitmq:
    image: rabbitmq:alpine
    environment:
      RABBITMQ_DEFAULT_USER: root
      RABBITMQ_DEFAULT_PASS: root
    ports:
      - 5672:5672
 */
const data = await (await RabbitmqClient()).createChannel();
```

#### Mailer Client
```js
/**
 * Mailer Client singleton.
 * @function MailerClient
 * @modules [nodemailer@^6 pino@^8 pino-pretty@^10]
 * @envs [MAILER_HOST, MAILER_USER, MAILER_PESS, LOG_SERVICE_NAME]
 * @param {object} { MAILER_HOST, MAILER_USER, MAILER_PESS }
 * @return {promise} the singleton instance
 * @docs https://nodemailer.com/about;
 */
const data = await (await MailerClient()).sendMail({ ... });
```
