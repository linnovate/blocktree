import { MongoClient } from '../services/mongo-client.js';
import { Logger } from '../utils/logger.js';

/**
 * Mongo Indexer.
 * @function MongoIndexer
 * @modules [mongoose]
 * @envs [MONGO_URI]
 * @param {object} { MONGO_URI, usingMongoose, modelName, collectionName, keyId, disconnectMongo }
 * @param {function} async batchCallback(offset, config) [{ ... , deleted: true }]
 * @param {function} async testCallback(config)
 * @return {promise} is done
 * @example const isDone = await MongoIndexer(config, async (offset, config) => [], async (config) => true);
 */
let mongoose;

export async function MongoIndexer(config, batchCallback, testCallback) {

  const logger = await Logger();

  try {

    /*
     * Connect Mongoose
     */
    if (config.usingMongoose) {

      mongoose = await import('mongoose').catch(err => {
        throw logger.error('MongoIndexer [missing module]: mongoose');
      });

      const MONGO_URI = config.MONGO_URI || process.env.MONGO_URI;

      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 3000,
        ...config.mongooseClientOptions,
      }).catch(error => {
        throw logger.error('MongoIndexer [connect]', { MONGO_URI, error });
      });

    }

    /*
     * Create data 
     */
    const offset = await insertData(config, batchCallback);

    logger.info('MongoIndexer [batch] succeeded', { ...config, count: offset });

    // disconnect mongo service
    if (config.disconnectMongo) {

      // using Mongoose
      if (config.usingMongoose) {
        await mongoose.disconnect();
      }
      // using MongoClient
      else {
        await (await MongoClient()).close();
      }
      // logger
      logger.info('MongoIndexer [disconnect]', { ...config });
    }
    
    /*
     * Test callback
     */
    if (testCallback) {
      if (testCallback(config)) {
        // logger
        logger.info('MongoIndexer [test] succeeded', { ...config });
      } else {
        // logger
        logger.error('MongoIndexer [test] failed', { ...config });
        return false;
      }
    }

    return true;


  } catch (error) {
    logger.error('MongoIndexer [error]', { error: error.toString() });
  }

};


/**
 * Insert data.
 * @function insertData
 * @param {function} async batchCallback(offset, config)
 * @return {promise} the offset
 */
async function insertData(config, batchCallback, offset = 0) {

  const logger = await Logger();

  /*
   * Load items
   */
  const items = await batchCallback(offset, config)
    .then((items) => {
      logger.info('MongoIndexer [batch callback] succeeded', { ...config, offset, count: items?.length });
      return items;
    })
    .catch((error) => {
      logger.error('MongoIndexer [batch callback] failed', { ...config, offset, error });
    });

  // logger

  // no items
  if (!items?.length) {
    return offset;
  }

  /*
   * Select mongo Model
   */
  let Model;

  // using mongoose
  if (config.usingMongoose) {

    // logger is no modelName
    if (!config.modelName) {
      logger.error('MongoIndexer [batch inserting] error', { ...config, error: 'config.modelName is required!' });
    }

    // get mongoose model
    Model = await mongoose.model(config.modelName);

  }

  // using mongoo
  else {

    // logger is no collectionName
    if (!config.collectionName) {
      logger.error('MongoIndexer [batch inserting] error', { ...config, error: 'config.collectionName is required!' });
    }

    // get mongo model
    Model = await (await MongoClient(config.MONGO_URI, config.mongoClientOptions))
      .db()
      .collection(config.collectionName);

  }

  // logger is no Model
  if (!Model) {
    logger.error('MongoIndexer [batch inserting] Model/Collection not found', { ...config, offset });
    return offset;
  }

  /*
   * Insert items
   */
  const logs = [];
  
  await Promise.all(items?.map(async item => {

    const keyFilter = { [config.keyId]: item[config.keyId] };
    
    // delete item 
    if (item?.deleted) {
      const { ok, deletedCount } = await Model.deleteOne(keyFilter);
      logs.push({ [config.keyId]: item[config.keyId], action: 'delete', deletedCount });
      return;
    }

    // create / update
    let newItem;
    if (!(await Model.findOne(keyFilter))) {
      newItem = await Model.insertMany([item])
      logs.push({ [config.keyId]: item[config.keyId], action: 'create', errors: newItem.errors });
    } else {
      newItem = await Model.updateOne(keyFilter, { $set: item }, { new: true });
      logs.push({ [config.keyId]: item[config.keyId], action: 'update', errors: newItem.errors });
    }

  }));

  /*
   * Logs
   */
  if (logs) {
    logger.info('MongoIndexer [batch inserting] succeeded', { ...config, logs });
  }

  /*
   * Run Next batch
   */
  return await insertData(config, batchCallback, offset + items.length);

}
