import { MongoClient } from '../services/mongo-client.js';
import { Logger } from '../utils/logger.js';

/**
 * Mongo Indexer.
 * @function MongoIndexer
 * @modules [mongodb@^6 pino@^8 pino-pretty@^10]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} {
     MONGO_URI,       // the mongo service uri (mongodb://[user]:[pass]@[host]:[port]/[db_name]?authSource=admin)
     collectionName,  // {null|string} the mongo collection name
     keyId,           // {null|string} the mongo doc key
     mode,            // {null|enum:new,clone,sync} "new" is using a new empty index, "clone" is using a clone of the last index, "sync" is using the current index. (default: "new") 
     keepAliasesCount,  // {null|number} how many index passes to save
     mongoClientOptions,
   }
 * @param {function} async batchCallback(offset, config, reports) [{ ... , deleted: true }]
 * @param {function} async testCallback(config, reports)
 * @return {promise} is done
 * @example const isDone = await MongoIndexer(config, async (offset, config, reports) => [], async (config) => true);
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

export async function MongoIndexer(config, batchCallback, testCallback) {

  // logger is no collectionName
  if (!config.collectionName) {
    logger.error('MongoIndexer [batch inserting] error', { ...config, error: 'config.collectionName is required!' });
  }

  const logger = await Logger();
  const reports = {};
  config.index = config.collectionName;

  function getIndexTime(indexName) {
    indexName = indexName
      .replace(`${config.index}---`, '')
      .replaceAll("_", " ")
      .replaceAll("-", ":")
    return new Date(indexName).getTime()
  }

  try {

    /*
     * Get Mongo Client instance
     */
    const db = await (await MongoClient(config.MONGO_URI, config.mongoClientOptions)).db();

    const listCollections = (await db.listCollections({}, { nameOnly: true }).toArray())
      ?.map(i => i.name)
      ?.filter(name => name.startsWith(`${config.index}---`) || name == config.index);

    /*
     * Create index (step 1)
     */
    // create name
    const timeFormat = new Date().toLocaleString('en', { hour12: false })
      .replaceAll("/", ".")
      .replaceAll(", ", "_")
      .replaceAll(":", "-");

    config.indexName = `${config.index}---${timeFormat}`;

    // get aliases
    const lastIndex = listCollections.find(name => name == config.index);

    // sync mode
    if (lastIndex && config.mode == 'sync') {
      config.indexName = lastIndex;
      logger.info('MongoIndexer [mode] sync', { alias: config.index, index: config.indexName });
    }
    // update mode
    else if (lastIndex && config.mode == 'clone') {
      await db[lastIndex].aggregate([{ $out: config.indexName }]);
      logger.info('MongoIndexer [mode] clone', { alias: config.index, index: config.indexName });
    }
    // new mode
    else {
      await db.createCollection(config.indexName);
      logger.info('MongoIndexer [mode] new', { alias: config.index, index: config.indexName });
    }

    reports["using_index"] = config.indexName;


    /*
     * Insert data (step 2)
     */
    const isDone = await insertData(config, batchCallback, reports)

    if (!isDone) {
      // skip update alias
      return reports;
    }

    /*
     * Test callback (step 3)
     */
    if (testCallback) {
      reports["testing_logs"] = [];
      const isTestSucceeded = await testCallback(config, reports)
        .then(() => {
          logger.info('MongoIndexer [testing] succeeded', { alias: config.index, index: config.indexName });
          return true;
        })
        .catch((error) => {
          logger.error('MongoIndexer [testing] failed', { alias: config.index, index: config.indexName, error: error?.toString() });
          reports["testing_error"] = error?.toString();
          return false;
        });

      reports["testing_succeeded"] = isTestSucceeded;

      if (!isTestSucceeded) {
        // skip update alias
        return reports;
      }
    }


    /*
     * Skip aliases (sync mode)
     */
    if (lastIndex && config.mode == 'sync') {
      return reports;
    }


    /*
     * Update alias (step 4)
     */
    await db.renameCollection(config.index, `${config.index}---${timeFormat}--draf`);
    await db.renameCollection(config.indexName, config.index);
    await db.renameCollection(`${config.index}---${timeFormat}--draf`, `${config.index}---${timeFormat}`);
    logger.info('MongoIndexer [aliases] succeeded', { alias: config.index, index: config.index });


    /*
     * Remove old indices (step 5)
     */
    // load indices of the alias
    const indicesData = listCollections?.filter(name => name.startsWith(`${config.index}---`));

    // sort by date
    const keepIndices = indicesData.sort((a, b) => getIndexTime(b) - getIndexTime(a));

    // split the list of keep & remove indices
    const removeIndices = keepIndices.splice(config.keepAliasesCount ?? 1);

    reports["keepIndices"] = keepIndices;
    reports["removeIndices"] = {};

    // delete old indexes
    for (let i = 0; i < removeIndices.length; i++) {
      await db.dropCollection(removeIndices[i])
        .then(() => {
          logger.info('MongoIndexer [remove index] succeeded', { alias: config.index, index: removeIndices[i], keepIndices });
          reports["removeIndices"][removeIndices[i]] = true;
        })
        .catch((error) => {
          logger.error('MongoIndexer [remove index] failed', { alias: config.index, index: removeIndices[i], keepIndices, error: error?.toString() });
          reports["removeIndices"][removeIndices[i]] = error?.toString();
        });
    }

    reports["succeeded"] = true;

  }
  catch (error) {
    logger.error('MongoIndexer [error]', { alias: config.index, error: error?.toString() });
    reports["general_error"] = error?.toString();
  }

  return reports;

};


/**
 * Insert data.
 * @function insertData
 * @param {function} async batchCallback(offset, config)
 * @return {promise} the offset
 */
async function insertData(config, batchCallback, reports, offset = 0) {

  const logger = await Logger();

  reports["insertData"] || (reports["insertData"] = {});
  reports["insertData"][offset] = {};

  /*
   * Load items (step 1)
   */
  reports["insertData"][offset]["callback_logs"] = [];
  const items = await batchCallback(offset, config, reports)
    .then((items) => {
      logger.info('MongoIndexer [batch callback] succeeded', { ...config, offset, count: items?.length });
      reports["insertData"][offset]["callback_succeeded"] = true;
      return items;
    })
    .catch((error) => {
      logger.error('MongoIndexer [batch callback] failed', { ...config, offset, error: error?.toString() });
      reports["insertData"][offset]["callback_error"] = error?.toString();
      return { error: error?.toString() }
    });

  // no items
  if (items?.error) {
    return false;
  }
  else if (!items?.length) {
    return true;
  }

  /*
   * Insert items (step 2)
   */
  const keyId = config.keyId || '_id';
  const docs = items.map(item => {
    const filter = (keyId in item) ? { [keyId]: item[keyId] } : {};
    if (item?.deleted) {
      return { deleteOne: { filter } }
    } else {
      return { updateOne: { filter, update: { $set: item }, upsert: true } }
    }
  })

  const response = await (await MongoClient(config.MONGO_URI, config.mongoClientOptions))
    .db()
    .collection(config.collectionName).bulkWrite(docs, { ordered: false })


  /*
   * Print Logs (step 3)
   */
  if (response.writeErrors) {
    const errors = response.items.map(i => i.index.error)
    logger.error('MongoIndexer [batch inserting] error', { alias: config.index, index: config.indexName, offset, count: items?.length, errors });
    reports["insertData"][offset]["inserting_errors"] = errors;
  }
  else {
    const logs = response.result;
    logger.info('MongoIndexer [batch inserting] succeeded', { alias: config.index, index: config.indexName, offset, count: items?.length, logs });
    reports["insertData"][offset]["inserting_succeeded"] = true;
  }

  /*
   * Run Next batch (step 4)
   */
  return await insertData(config, batchCallback, reports, offset + items.length);

}


/**
 * Restore Mongo Indexer.
 * @function RestoreMongoIndexer
 * @modules [mongodb@^6 pino@^8 pino-pretty@^10]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} {
     MONGO_URI,      // the mongo service uri (mongodb://[user]:[pass]@[host]:[port]/[db_name]?authSource=admin)
     aliasName,      // {string} the alias name
     indexName,      // {string} the index name
     lastIndexCount: // {number} the count of lasts index
   }
 * @return {bool} is done
 * @example const isDone = await RestoreMongoIndexer({ MONGO_URI, aliasName, indexName });
 */
export async function RestoreMongoIndexer({ MONGO_URI, mongoClientOptions, aliasName, indexName, lastIndexCount }) {

  const logger = await Logger();

  function getIndexTime(indexName) {
    indexName = indexName
      .replace(`${aliasName}---`, '')
      .replaceAll("_", " ")
      .replaceAll("-", ":")
    return new Date(indexName).getTime()
  }

  try {

    /*
     * Get Mongo Client instance
     */
    const db = await (await MongoClient(MONGO_URI, mongoClientOptions)).db();

    // load indices of the alias
    const listCollections = (await db.listCollections({}, { nameOnly: true }).toArray())
      ?.map(i => i.name)
      ?.filter(name => name.startsWith(`${aliasName}---`));

    /*
     * Find index
     */
    if (lastIndexCount) {

      // sort by date
      const indicesList = listCollections.sort((a, b) => getIndexTime(b) - getIndexTime(a));
      indexName = indicesList[Math.hypot(lastIndexCount)];
    }

    if (!listCollections.includes(indexName)) {
      logger.error('MongoIndexer [error]', { aliasName, indexName, error: 'not found' });
      return false;
    }

    /*
     * Update alias
     */
    // create time format
    const timeFormat = new Date().toLocaleString('en', { hour12: false })
      .replaceAll("/", ".")
      .replaceAll(", ", "_")
      .replaceAll(":", "-");

    await db.renameCollection(aliasName, `${aliasName}---${timeFormat}`);
    await db.renameCollection(indexName, aliasName);
    logger.info('MongoIndexer [aliases] succeeded', { aliasName, indexName });

    return true;

  } catch (error) {
    logger.error('MongoIndexer [error]', { aliasName, indexName, error: error?.toString() });
  }

};


/**
 * Mongo Indexer Backups.
 * @function MongoIndexerBackups
 * @modules [mongodb@^6 pino@^8 pino-pretty@^10]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} {
     MONGO_URI,     // the mongo service uri (mongodb://[user]:[pass]@[host]:[port]/[db_name]?authSource=admin)
     aliasName,     // {string} the alias name
   }
 * @return {object} { data, actives }
 * @example const backupsList = await MongoIndexerBackups({ MONGO_URI, aliasName });
 */
export async function MongoIndexerBackups({ MONGO_URI, mongoClientOptions, aliasName }) {

  function getIndexTime(indexName) {
    indexName = indexName
      .replace(`${aliasName}---`, '')
      .replaceAll("_", " ")
      .replaceAll("-", ":")
    return new Date(indexName).getTime()
  }

  // Get Mongo Client instance
  const db = await (await MongoClient(MONGO_URI, mongoClientOptions)).db();

  const listCollections = (await db.listCollections({}, { nameOnly: true }).toArray())
    ?.map(i => i.name)
    ?.filter(name => name.startsWith(`${aliasName}---`) || name == aliasName);

  // Load indices of the alias
  const indicesData = listCollections?.filter(name => name.startsWith(`${aliasName}---`));

  const actives = listCollections?.filter(name => name == aliasName);

  // sort by date
  const data = indicesData.sort((a, b) => getIndexTime(b) - getIndexTime(a));

  return { data, actives };

};
