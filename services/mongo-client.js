import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Mongo Client singleton.
 * @function MongoClient
 * @modules [mongodb@^5 pino@^8 pino-pretty@^10]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {string} MONGO_URI the mongo service uri (mongodb://[host]:[port]/[db_name])
 * @param {object} MongoClientOptions
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mongodb
 * @example const data = await (await MongoClient()).db('...');
 * @example const mongo = await MongoClient(); const data = await mongo.db('...');
 * @dockerCompose
  # Mongo service
  mongo:
    image: mongo:7-jammy
    volumes:
      - ./.mongo:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    ports:
      - 27017:27017
 */

let $instance;

export async function MongoClient(MONGO_URI, mongoClientOptions) {

  const logger = await Logger();

  if ($instance) {
    await $instance.connect();
    return $instance;
  }

  // imports
  const { MongoClient } = await DynamicImport('mongodb@^6');

  // envs
  MONGO_URI ??= process.env.MONGO_URI;

  if (!MONGO_URI) {
    logger.error('MongoClient [missing env]: MONGO_URI');
  }

  // instance 
  $instance = new MongoClient(MONGO_URI, mongoClientOptions);
  await $instance.connect()
    .catch(error => {
      logger.error('MongoClient [error]', { error });
    });;

  return $instance;

};
