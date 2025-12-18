/**
 * Server
 */
import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));  


/* ========================  Utils ======================== */


/**
 * DynamicImport
 */
import { DynamicImport } from '#linnovate/blocktree';
const module = await DynamicImport('express@^5');


/** 
 * Logger
 */
import { Logger, logger } from '#linnovate/blocktree';
await Logger({ DEBUG: 'blocktree', LOG_SERVICE_NAME: 'blocktree' });
logger.debug('User logged in', { userId: 123 });


/**
 * FetchClient
 */
import { FetchClient } from '#linnovate/blocktree';
{
 const { ok, status, data } = await FetchClient('http://localhost:3000/health');
 console.log('FetchClient:', { ok, status, data });
}

/**
 * JWTParser
 */
import { JWTParser } from '#linnovate/blocktree';
const jwtParsed = await JWTParser(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30',
  'a-string-secret-at-least-256-bits-long'
);
console.log('JWTParser:', jwtParsed);


/**
 * JwtSession
 */
import { JwtSession } from '#linnovate/blocktree';
const jwtSession = await JwtSession({
  headers: {},
  setCookie: (...args) => { console.log('setCookie', args) },
  JWT_SECRET_KEY: 'secret cat',
})
jwtSession.time = Date.now();


/* ========================  Server ======================== */


/** 
 * Optimize Express
 */ 
import { OptimizeExpress } from '#linnovate/blocktree';
OptimizeExpress(app)


/**
 * Security Express
 */
import { SecurityExpress } from '#linnovate/blocktree';
SecurityExpress(app)


/**
 * Swagger Express
 */
import { SwaggerExpress } from '#linnovate/blocktree';
SwaggerExpress(app);


/**
 * JwtSession Express
 */
import { JwtSessionExpress } from '#linnovate/blocktree';
await JwtSessionExpress(app, { JWT_SECRET_KEY: 'secret cat' });
app.get('/profile', (req, res) => {
  console.log(req.jwtSession.last_visit);
  req.jwtSession.last_visit = new Date();
  res.send('Session updated');
});


// /* ========================  Graphql ======================== */


/**
 * Graphql Server
 */
import { GraphqlServer } from '#linnovate/blocktree';
GraphqlServer(app);


/**
 * Graphql Client
 */
import { GraphqlClient } from '#linnovate/blocktree';
{
  const { ok, status, data } = await GraphqlClient('http://localhost:3000/graphql', { query: '{health}', variables: {}, authToken: 'MY_TOKEN' })
  console.log('GraphqlClient:', { ok, status, data });
}


/* ========================  Mongo ======================== */


// /**
//  * Mongo Client
//  */
// import { MongoClient } from '#linnovate/blocktree';
// {
//   const mongo = await MongoClient({ MONGO_URI: 'mongodb://root:root@localhost:27017' });
//   console.log("MongoClient:", await mongo?.db('admin').command({ ping: 1 }) );
// }
// {
//   const mongo = await MongoClient({ mock: true });
//   console.log("MongoClient Mocking:", await mongo?.db('admin').command({ ping: 1 }) );
// }

// /**
//  * Mongo Indexer
//  */
// import { MongoIndexer, MongoIndexerBackups, MongoIndexerRestore } from '#linnovate/blocktree';

// const mongoIndexer = await MongoIndexer({ index: 'test', MONGO_URI: 'mongodb://root:root@localhost:27017', keepAliasesCount: 5 }, async ({ offset, index, mode, response }) => offset == 0 ? [{ time: Date.now() }] : [] ); //, async ({ index, activeIndexName }) => true);
// console.log("mongoIndexereee", { mongoIndexer })

// await MongoIndexerRestore({ index: 'test', backupIndex: 'test---12.2.2025_18-29-08', MONGO_URI: 'mongodb://root:root@localhost:27017' });
// await MongoIndexerRestore({ index: 'test', lastIndexCount: 1, MONGO_URI: 'mongodb://root:root@localhost:27017' });
// const mongoBackups = await MongoIndexerBackups({ index: 'test', MONGO_URI: 'mongodb://root:root@localhost:27017' });
// console.log("mongoBackups", { mongoBackups })


/* ========================  Elastic ======================== */


// /**
//  * Elastic Client
//  */
// import { ElasticClient } from '#linnovate/blocktree';
// {
//   const elastic = await ElasticClient({ ELASTICSEARCH_URL: 'http://localhost:9200' });
//   console.log("ElasticClient:", await elastic.search({}) );
// }
// {
//   const elastic = await ElasticClient({ mock: true });
//   elastic.mockServer.add({ method: 'GET', path: '/article/_search' }, () => ({ hits: { total: { value: 1}, hits: [{ _index: 'article', _id: '1', _source: { text: 'some text' }}] }}));
//   console.log("ElasticClient Mocking:", await elastic.search({ index: 'article' }) );
// }

// const opensearchClient = await ElasticClient({ ELASTICSEARCH_URL: 'http://localhost:9500', useOpensearch: true });
// await opensearchClient.search();
 
   
// /**
//  * Elastic Indexer
//  */  
// import { ElasticIndexer, ElasticIndexerBackups, ElasticIndexerRestore } from '#linnovate/blocktree';

// const elasticIndexer = await ElasticIndexer({ index: 'test', ELASTICSEARCH_URL: 'http://localhost:9200', useOpensearch: false, keepAliasesCount: 5 }, async ({ offset, index, mode, response }) => offset == 0 ? [{ time: Date.now() }] : []); //, async ({ index, activeIndexName }) => true);
// await ElasticIndexerRestore({ index: 'test', backupIndex: 'test---12.2.2025_16-20-58', ELASTICSEARCH_URL: 'http://localhost:9200', useOpensearch: false });
// await ElasticIndexerRestore({ index: 'test', lastIndexCount: 1, ELASTICSEARCH_URL: 'http://localhost:9200', useOpensearch: false });
// const elasticBackups = await ElasticIndexerBackups({ index: 'test', ELASTICSEARCH_URL: 'http://localhost:9200', useOpensearch: false });
// console.log("elasticBackups", { elasticBackups })
 
// const opensearchIndexer = await ElasticIndexer({ index: 'test', ELASTICSEARCH_URL: 'http://localhost:9500', useOpensearch: true, keepAliasesCount: 5 }, async ({ offset, index, mode, response }) => offset == 0 ? [{ time: Date.now() }] : [], async ({ index, activeIndexName }) => true);
// await ElasticIndexerRestore({ index: 'test', backupIndex: 'test---12.2.2025_17-15-34', ELASTICSEARCH_URL: 'http://localhost:9500', useOpensearch: true });
// await ElasticIndexerRestore({ index: 'test', lastIndexCount: 1, ELASTICSEARCH_URL: 'http://localhost:9500', useOpensearch: true });
// const opensearchBackups = await ElasticIndexerBackups({ index: 'test', ELASTICSEARCH_URL: 'http://localhost:9500', useOpensearch: true });
// console.log("opensearchBackups", { opensearchBackups })


/* ========================  Services ======================== */


// /**
//  * Redis Client
//  */
// import { RedisClient } from '#linnovate/blocktree';
// const redis = await RedisClient({ REDIS_URI: 'redis://localhost:6379/1' });
// console.log('RedisClient:', await redis.set('key', 'value'));  

// /**
//  * Redis Proxy
//  */
// import { RedisProxy } from '#linnovate/blocktree';
// {
//   const { ok, status, data } = await RedisProxy('http://localhost:3000/123', {}, { REDIS_URI: 'redis://localhost:6379/1' });
//   console.log('RedisProxy:', { ok, status, data });
// }


// /**
//  * MySql Client
//  */
// import { MySqlClient } from '#linnovate/blocktree';
// const mysql = await MySqlClient({ usePool: true, MYSQL_HOST: 'localhost', MYSQL_USER: 'root', MYSQL_PASS: 'root', MYSQL_DB: 'test' });
// console.log('MySqlClient:', await mysql.query('SELECT * FROM users WHERE id = ?', [1]).catch(error => error) );


// /**
//  * Rabbitmq Client
//  */
// import { RabbitmqClient } from '#linnovate/blocktree';
// const rabbitmq = await RabbitmqClient({ RABBITMQ_URI: 'amqp://localhost:5672' });
// const channel = await rabbitmq?.createChannel(); 
// await channel?.assertQueue('queue', { durable: false });
// channel?.consume('queue', (msg) => console.log(msg?.content.toString()));
// channel?.sendToQueue('queue', Buffer.from('something to do'));


// /**
//  * Assert Queue & SendToQueue
//  */
// import { AssertQueue, SendToQueue } from '#linnovate/blocktree';

// process.env.RABBITMQ_URI = 'amqp://localhost:5672'
// AssertQueue('update_item', (data) => { console.log(data) }, { RABBITMQ_URI: 'amqp://localhost:5672' });
// SendToQueue('update_item', {});
