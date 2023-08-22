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
 - [RabitmqChannel](#rabitmq-channel)

> [Utils](#utils)
 - [Logger](#logger)

> [Services: Databases](#services-databases)
 - [Elastic Client](#elastic-client)
 - [Mongo Client](#mongo-client)
 - [MySql Client](#mysql-client)
 - [Redis Client](#redis-client)

> [Services: Api](#services-api)
 - [JsonApi Client](#jsonapi-client)
 - [Graphql Client](#graphql-client)
 - [Google Storage](#google-storage)
 - [S3 Storage](#s3-storage)

> [Services: Handlers](#services-handlers)
 - [Rabitmq Client](#rabitmq-client)
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
 * @modules [compression helmet cors]
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
 * @modules [graphql graphql-yoga ws graphql-ws]
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
```

### Tools
---

#### JWT Parser
```js
/**
 * JWT Parser
 * @function JWTParser
 * @modules [jsonwebtoken@^8 winston@^3]
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
 * @modules [@elastic/elasticsearch@^8 winston@^3]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic host
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
 */
const isDone = await ElasticIndexer({ index: "my_name", mappings: {}, settings: {} }, (offset, config) => [], (config) => true);
```
```js
/**
 * Restore Elastic Indexer.
 * @function RestoreElasticIndexer
 * @modules [@elastic/elasticsearch@^8 winston@^3]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic host
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
 * @modules [mongodb@^5 mongoose@^7 winston@^3]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} { MONGO_URI, usingMongoose, modelName, collectionName, keyId, disconnectMongo }
 * @param {function} async batchCallback(offset, config) [{ ... , deleted: true }]
 * @param {function} async testCallback(config)
 * @return {promise} is done
 * @example  */
const isDone = await MongoIndexer({ MONGO_URI, usingMongoose: true, modelName: "Article", collectionName: "articles" }, async (offset, config) => [], async (config) => true);
```

#### Rabitmq Channel
```js
/**
 * Assert Queue
 * @function AssertQueue
 * @modules [amqplib@^0.10 winston@^3]
 * @envs [REBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {function} handler
 * @param {object} options { REBITMQ_URI }
 * @return 
 */
AssertQueue('update_item', (data) => { console.log(data) });

/**
 * Send to queue
 * @function SendToQueue
 * @modules [amqplib@^0.10 winston@^3]
 * @envs [REBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {object} data
 * @param {object} options { REBITMQ_URI }
 * @return 
 */
SendToQueue('update_item', {});
```

### Utils
---

#### Logger
```js
/**
 * Logger.
 * @function Logger
 * @modules [winston@^3]
 * @envs [LOG_SERVICE_NAME]
 * @param {object} { LOG_SERVICE_NAME }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/winston
 */
(await Logger()).log('...', '...');
Logger().then(logger => logger.log('...', '...'));
const logger = await Logger(); logger.log('...', '...');
```

### Services: Databases
---

#### Elastic Client
```js
/**
 * Elastic Client singleton.
 * @function ElasticClient
 * @modules [@elastic/elasticsearch@^8 winston@^3]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} { ELASTICSEARCH_URL }
 * @return {promise} the singleton instance
 * @docs https://www.elastic.co/guide/en/elasticsearch/reference/8.5/elasticsearch-intro.html
 */
const data = await (await ElasticClient()).search({ ... });
```

#### Mongo Client
```js
/**
 * Mongo Client singleton.
 * @function MongoClient
 * @modules [mongodb@^5 winston@^3]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {string} MONGO_URI
 * @param {object} MongoClientOptions
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mongodb
 */
const data = await (await MongoClient()).db('...');
```

#### MySql Client
```js
/**
 * MySql Client singleton.
 * @function MySqlClient
 * @modules [mysql2@^3 winston@^3]
 * @envs [MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB, LOG_SERVICE_NAME]
 * @param {object} { MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mysql2
 */
const data = await (await MySqlClient()).query('...', () => {});
```

#### Redis Client
```js
/**
 * Redis Client singleton.
 * @function RedisClient
 * @modules [redis@^4 winston@^3]
 * @envs [REDIS_URI, LOG_SERVICE_NAME]
 * @param {object} { REDIS_URI }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/redis
 */
const data = await (await RedisClient()).set('key', 'value');
```

### Services: Apis
---

#### JsonApi Client
```js
/**
 * JsonApi client
 * @function JsonApiClient
 * @modules [winston@^3]
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
 * @modules [winston@^3]
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

#### Graphql Client
```js
/**
 * GraphqlClient
 * @function GraphqlClient
 * @modules [winston@^3]
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



#### Google Storage
```js
/**
 * Google Storage singleton.
 * @function GoogleStorage
 * @modules [@google-cloud/storage@^7 winston@^3]
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
 * @modules [@aws-sdk/client-s3@^3 winston@^3]
 * @envs [S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, LOG_SERVICE_NAME]
 * @param {object} { S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/@aws-sdk/client-s3
 */
const data = await (await S3Storage()).send(command);
```

### Services: Handlers
---

#### Rabitmq Client
```js
/**
 * Rabitmq Client singleton.
 * @function RabitmqClient
 * @modules [amqplib@^0.10 winston@^3]
 * @envs [REBITMQ_URI, LOG_SERVICE_NAME]
 * @param {object} { REBITMQ_URI: "amqp://test:password@<IP>:5672" }
 * @return {promise} the singleton instance
 * @docs https://github.com/amqp-node/amqplib
 */
const data = await (await RabitmqClient()).createChannel();
```

#### Mailer Client
```js
/**
 * Mailer Client singleton.
 * @function MailerClient
 * @modules [nodemailer@^6 winston@^3]
 * @envs [MAILER_HOST, MAILER_USER, MAILER_PESS, LOG_SERVICE_NAME]
 * @param {object} { MAILER_HOST, MAILER_USER, MAILER_PESS }
 * @return {promise} the singleton instance
 * @docs https://nodemailer.com/about;
 */
const data = await (await MailerClient()).sendMail({ ... });
```
