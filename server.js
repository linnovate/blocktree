/**
 * Server
 */
import express from 'express';
const app = express();
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`)); // eslint-disable-line no-unused-vars


/**
 * Logger
 */
import { Logger, logger } from '#linnovate/blocktree';
process.env.LOG_LEVEL = "debug"
process.env.LOG_SERVICE_NAME = "blocktree"
await Logger({ server: null });
logger.info('First log!', { time: Date.now() });


// /**
//  * Rabbitmq Client
//  */
// import { RabbitmqClient } from '#linnovate/blocktree';
 
// const rabbitmqClient = await RabbitmqClient({ RABBITMQ_URI: "amqp://localhost:5672" });
// const channel = await rabbitmqClient?.createChannel(); 
// await channel?.assertQueue("queue", { durable: false });
// channel?.consume("queue", (msg) => console.log(msg?.content.toString()));
// channel?.sendToQueue("queue", Buffer.from('something to do'));


// /**
//  * Assert Queue
//  */
// import { AssertQueue, SendToQueue } from '#linnovate/blocktree';

// process.env.RABBITMQ_URI = "amqp://localhost:5672"
// AssertQueue('update_item', (data) => { console.log(data) }, { RABBITMQ_URI: "amqp://localhost:5672" });
// SendToQueue('update_item', {});

// /**
//  * Redis Client
//  */
// import { RedisClient } from '#linnovate/blocktree';

// const redisClient = await RedisClient({ REDIS_URI: "redis://localhost:6379/1" });
// await redisClient.set('key', 'value');    


// /**
//  * Optimize Express
//  */
// import { OptimizeExpress } from '#linnovate/blocktree';
// OptimizeExpress(app)


// /**
//  * Security Express
//  */
// import { SecurityExpress } from '#linnovate/blocktree';
// SecurityExpress(app)


// /**
//  * Swagger Express
//  */
// import { SwaggerExpress } from '#linnovate/blocktree';
// SwaggerExpress(app);


// /**
//  * Graphql Server
//  */
// import { createServer } from 'node:http';
// import { GraphqlServer, GraphqlClient } from '#linnovate/blocktree';

// app.use("/graphql", await GraphqlServer([{ typeDefs: '', resolvers: {} }]) );

// createServer(await GraphqlServer([{ typeDefs: '', resolvers: {} }]) )
//   .listen(4000, () => console.log(`Example graphql listening on port ${PORT}!`))

// const data = await GraphqlClient("http://server:5000/graphql", { query: "{health}", variables: {}, authToken: "MY_TOKEN" })


// /**
//  * Mongo Client
//  */
// import { MongoClient } from '#linnovate/blocktree';
   
// const mongoClientMock = await MongoClient({ mock: true });
// await mongoClientMock.db("admin").command({ ping: 1 });
 
// const mongoClient = await MongoClient({ MONGO_URI: "mongodb://root:root@mongo:27017" });
// await mongoClient.db("admin").command({ ping: 1 });


// /**
//  * Mongo Indexer
//  */
// import { MongoIndexer, MongoIndexerBackups, MongoIndexerRestore } from '#linnovate/blocktree';

// const mongoIndexer = await MongoIndexer({ index: "test", MONGO_URI: "mongodb://root:root@mongo:27017" }, async (offset, { index, mode, response }) => offset == 0 ? [{ time: Date.now() }] : [], async (config, reports) => true);
// const mongoBackups = await MongoIndexerBackups({ index: "test", MONGO_URI: "mongodb://root:root@mongo:27017" });
// await MongoIndexerRestore({ index: "test", lastIndexCount:2, MONGO_URI: "mongodb://root:root@mongo:27017" });

// /**
//  * Mongo Indexer Express
//  */
// import { MongoIndexerExpress } from '#linnovate/blocktree';

// MongoIndexerExpress(app, {
//   configs: [{
//     MONGO_URI: 'mongodb://root:root@mongo:27017/test?authSource=admin',
//     collectionName: 'items',
//   }],
//   batchCallback: async (offset, config, reports) => !offset && [{ count: 1 }, { count: 2 }],
// });


// /**
//  * Elastic Client
//  */
// import { ElasticClient } from '#linnovate/blocktree';

// const elasticClientMock = await ElasticClient({ mock: true });
// await elasticClientMock.search({});

// const elasticClient = await ElasticClient({ ELASTICSEARCH_URL: "http://elastic:9200", useOpensearch: false });
// await elasticClient.search();

// const opensearchClient = await ElasticClient({ ELASTICSEARCH_URL: "http://opensearch:9200", useOpensearch: true });
// await opensearchClient.search();


// /**
//  * Elastic Indexer
//  */
// import { ElasticIndexer, ElasticIndexerBackups, ElasticIndexerRestore } from '#linnovate/blocktree';

// const elasticIndexer = await ElasticIndexer({ index: "test", ELASTICSEARCH_URL: "http://elastic:9200", useOpensearch: false }, async (offset, { index, mode, response }) => offset == 0 ? [{ time: Date.now() }] : [], async (config, reports) => true);
// const elasticBackups = await ElasticIndexerBackups({ index: "test", ELASTICSEARCH_URL: "http://elastic:9200", useOpensearch: false });
// await ElasticIndexerRestore({ index: "test", lastIndexCount:2, ELASTICSEARCH_URL: "http://elastic:9200", useOpensearch: false });

// const opensearchIndexer = await ElasticIndexer({ index: "test", ELASTICSEARCH_URL: "http://opensearch:9200", useOpensearch: true }, async (offset, { index, mode, response }) => offset == 0 ? [{ time: Date.now() }] : [], async (config, reports) => true);
// const opensearchBackups = await ElasticIndexerBackups({ index: "test", ELASTICSEARCH_URL: "http://opensearch:9200", useOpensearch: true });
// await ElasticIndexerRestore({ index: "test", lastIndexCount:2, ELASTICSEARCH_URL: "http://opensearch:9200", useOpensearch: true });


// /**
//  * Elastic Indexer Express
//  */
// import { ElasticIndexerExpress } from '#linnovate/blocktree';

// ElasticIndexerExpress(app, {
//   ELASTIC_INDEXER_PATH: '/elastic-indexer',
//   useOpensearch: false,
//   ELASTICSEARCH_URL: "http://elastic:9200",
//   batchCallback: async (offset, config, reports) => !offset && [{ count: 1 }, { count: 2 }],
// });
