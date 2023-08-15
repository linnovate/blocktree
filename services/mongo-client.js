import { Logger } from '../utils/logger.js';

/**
 * Mongo Client singleton.
 * @function MongoClient
 * @modules mongodb@^4
 * @envs MONGO_URI
 * @param {string} MONGO_URI
 * @param {object} MongoClientOptions
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mongodb
 * @example const data = await (await MongoClient()).db('...');
 */

let $instance;

export async function MongoClient(MONGO_URI, mongoClientOptions) {

  const logger = await Logger();

  if ($instance) {
    await $instance.connect();
    return $instance;
  }

  // imports
  const { MongoClient } = await import('mongodb').catch(error => {
    logger.error('MongoClient [missing module]: mongodb');
  });

  // envs
  MONGO_URI ??= process.env.MONGO_URI;

  if (!MONGO_URI) {
    logger.error('MongoClient [missing env]: MONGO_URI');
  }

  // instance 
  $instance = new MongoClient(MONGO_URI, mongoClientOptions);
  await $instance.connect()
    .catch(error => {
      logger.error('MongoClient [connect]', { error });
    });;

  return $instance;

};
