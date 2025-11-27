/**
 * Mongo Indexer.
 * @function MongoIndexer
 * @modules [mongodb@^7 pino@^10 pino-pretty@^13]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} {
     index,  // {null|string} the mongo collection name
     keyId,           // {null|string} the mongo doc key
     mode,            // {null|enum:new,clone,sync} "new" is using a new empty index, "clone" is using a clone of the last index, "sync" is using the current index. (default: "new") 
     keepAliasesCount,  // {null|number} how many index passes to save
     options,
   }
 * @param {function} async batchCallback(offset, config, reports) [{ ... , deleted: true }]
 * @param {function} async testCallback(config, reports)
 * @return {promise} is done
 * @example const isDone = await MongoIndexer(config, async (offset, config, reports) => [], async (config) => true);
 * @dockerCompose
  # Mongo service
  mongo:
    image: mongo:8-noble
    volumes:
      - ./.mongo:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    ports:
      - 27017:27017
*/
export async function MongoIndexer({ index, keyId, mode, keepAliasesCount, ...options }, batchCallback, testCallback) {

  /*
   * Imports
   */
  const { MongoClient } = await import('../services/mongo-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`MongoIndexer [setup] options`, { index, keyId, mode, keepAliasesCount, ...options });

  /*
   * Options
   */
  if (!index) {
    return logger.error('MongoIndexer [missing option]: index');
  }

  /*
   * Vars
   */
  const db = await (await MongoClient({ logPrefix: 'MongoIndexer:', ...options })).db();
  const sortByTime = (obj) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll("_", " ").replaceAll("-", ":")).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Use index (step 1)
   */
  logger.debug(`MongoIndexer [1.find-index] start! {alias:${index}}`, { index, mode });
  // get the last indexName 
  const indexAliases = (await db.listCollections({}, { nameOnly: true }).toArray())
    ?.map(i => i.name)
    ?.filter(name => name.startsWith(`${index}---`) || name == index);
  const lastIndexName = indexAliases.find(name => name == index);
  // generate a new index name
  const timeFormat = new Date().toLocaleString('en', { hour12: false }).replaceAll("/", ".").replaceAll(", ", "_").replaceAll(":", "-");
  let activeIndexName = `${index}---${timeFormat}`;

  // create/use the active index by mode
  if (mode == 'sync' && lastIndexName) {
    activeIndexName = lastIndexName;
  }
  else if (mode == 'clone' && lastIndexName) {
    await db.collection(index).aggregate([{ $out: activeIndexName }]);
  }
  else {
    await db.createCollection(activeIndexName);
  }
  logger.debug(`MongoIndexer [1.find-index] end! {${activeIndexName != lastIndexName ? "create index:" : "use index:"}${activeIndexName}}`, { index, mode, activeIndexName, lastIndexName, indexAliases });

  /*
   * Insert data (step 2)
   */
  const insertData = async (offset = 0, response) => {
    // run batch
    const items = await batchCallback(offset, { index, mode, response }).catch((error) => ({ error: error?.toString() }));
    // has error
    if (items?.error) {
      return false;
    }
    // end data
    else if (!items?.length) {
      return true;
    }
    // generate bulk data
    const keyId = keyId || '_id';
    const docs = items.map(item => {
      const filter = (keyId in item) ? { [keyId]: item[keyId] } : {};
      if (item?.deleted) {
        return { deleteOne: { filter } }
      } else {
        return { updateOne: { filter, update: { $set: item }, upsert: true } }
      }
    })
    const bulkResponse = await db.collection(activeIndexName).bulkWrite(docs, { ordered: false })
    // run next batch
    return await insertData(offset + items.length, bulkResponse);
  };

  logger.debug('MongoIndexer [2.insert-data] start!', { index });
  const isDone = await insertData();
  logger.debug('MongoIndexer [2.insert-data] end!', { index });

  if (!isDone) {
    return false;
  }

  /*
   * Test callback (step 3)
   */
  if (testCallback) {
    const isTestSucceeded = await testCallback(options)
      .then(() => {
        logger.info('MongoIndexer [3.testing] succeeded', { alias: index, index: activeIndexName });
        return true;
      })
      .catch((error) => {
        logger.error('MongoIndexer [3.testing] failed', { alias: index, index: activeIndexName, error: error?.toString() });
        return false;
      });
    if (!isTestSucceeded) {
      return false;
    }
  }
  else {
    logger.debug('MongoIndexer [3.testing] no testing!', { index });
  }

  /*
   * Update/Remove aliases (step 4)
   */
  if (lastIndexName && mode != 'sync') {
    logger.debug('MongoIndexer [4.update-aliases] start!', { index });
    await db.renameCollection(index, `${activeIndexName}--draf`);
    await db.renameCollection(activeIndexName, index);
    await db.renameCollection(`${activeIndexName}--draf`, `${activeIndexName}`);
    logger.debug('MongoIndexer [4.update-aliases] end!', { index, activeIndexName });
  }
  else {
    await db.renameCollection(activeIndexName, index);
    logger.debug('MongoIndexer [4.update-aliases] no aliases!', { index });
  }

  /*
   * Remove old indices (step 5)
   */
  logger.debug('MongoIndexer [remove-indices] start!', { index });
  // load indices of the alias
  const indicesData = indexAliases?.filter(name => name.startsWith(`${index}---`));
  // split the list of keep & remove indices
  const removeIndices = sortByTime(indicesData).splice(options.keepAliasesCount ?? 1);
  // delete old indexes
  for (let i = 0; i < removeIndices.length; i++) {
    await db.dropCollection(removeIndices[i])
      .then(() => {
        logger.info('MongoIndexer [remove index] succeeded', { alias: index, index: removeIndices[i] });
      })
      .catch((error) => {
        logger.error('MongoIndexer [remove index] failed', { alias: index, index: removeIndices[i], error: error?.toString() });
      });
  }
  logger.debug('MongoIndexer [remove-indices] end!', { index });

  return true;

};
