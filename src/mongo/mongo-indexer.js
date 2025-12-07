/**
 * Mongo Indexer.
 * @function MongoIndexer
 * @modules [mongodb@^7 pino@^10 pino-pretty@^13]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} {
     index,  // {null|string} the mongo collection name
     keyId,           // {null|string} the mongo doc key
     mode,            // {null|enum:new,clone,sync} 'new' is using a new empty index, 'clone' is using a clone of the last index, 'sync' is using the current index. (default: 'new') 
     keepAliasesCount,  // {null|number} how many index passes to save
     options,
   }
 * @param {function} async batchCallback(offset, config, reports) [{ ... , deleted: true }]
 * @param {function} async testCallback(config, reports)
 * @return {promise:object} the messages { error: NO_INDEX_NAME || FIND_INDEX_FAILED || INSERT_DATA_FAILED || TEST_DATA_FAILED || UPDATE_ALIASES_FAILED ||REMOVE_OLD_INDICES_FAILED }
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
export async function MongoIndexer(
  {
    index,
    mode = 'new',
    keyId = 'id',
    keepAliasesCount = 1,
    ...options
  },
  batchCallback,
  testCallback = async () => true,
) {
 
  /*
   * Imports
   */
  const { MongoClient } = await import('../services/mongo-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`MongoIndexer [setup] options`, { namespace: 'MongoIndexer', index, keyId, mode, keepAliasesCount, ...options });

  /*
   * Options
   */
  if (!index) {
    logger.error('MongoIndexer [missing option]: index');
    return { error: "NO_INDEX_NAME" };
  }

  /*
   * Vars
   */
  const client = await MongoClient({ logPrefix: 'MongoIndexer:', ...options });
  const sortByTime = (array) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':').replaceAll('--draf', '')).getTime();
    return array.sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Use index (step 1)
   */
  logger.debug(`MongoIndexer (1/5)[find-index] start! (alias: ${index})`, { namespace: 'MongoIndexer', index, mode });

  // get the last indexName 
  const indexAliases = (await client.db().listCollections({}, { nameOnly: true }).toArray())
    ?.map(i => i.name)
    ?.filter(name => name.startsWith(`${index}---`) || name == index);
  const lastIndexName = indexAliases.find(name => name == index);
  
  // generate a new index name
  const timeFormat = new Date().toLocaleString('en', { hour12: false }).replaceAll('/', '.').replaceAll(', ', '_').replaceAll(':', '-');
  let activeIndexName = `${index}---${timeFormat}`;

  // create/use the active index by mode
  let resUseIndex;
  if (mode == 'sync' && lastIndexName) {
    activeIndexName = lastIndexName;
    resUseIndex = true;
  }
  else if (mode == 'clone' && lastIndexName) {
    resUseIndex = await client.db().collection(index).aggregate([{ $out: activeIndexName }]);
  }
  else {
    resUseIndex = await client.db().createCollection(activeIndexName);
  }

  logger.debug(`MongoIndexer (1/5)[find-index] end! (${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`, { namespace: 'MongoIndexer', index, mode, activeIndexName, lastIndexName, indexAliases });
  
  // step logger
  if (resUseIndex) {
    logger.info(`MongoIndexer (1/5)[find-index] succeeded! (alias: ${index}, ${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (1/5)[find-index] failed! (alias: ${index}, ${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`);
    return { error: "FIND_INDEX_FAILED" };
  }
  
  /*
   * Insert data (step 2)
   */
  const insertData = async (offset = 0, response) => {
    logger.debug(`MongoIndexer (2/5)[insert-data] batch (index: ${activeIndexName}, offset: ${offset})`, { namespace: 'MongoIndexer', index, mode, activeIndexName });
    // run batch
    const items = await batchCallback({ offset, index, mode, response }).catch((error) => ({ error }));
    // callback error
    if (items?.error) {
      logger.error(`MongoIndexer (2/5)[insert-data] callback - ${items?.error?.toString?.()} (index: ${activeIndexName}, offset: ${offset})`);
      return false;
    }
    // end data
    else if (!items?.length) {
      return true;
    }
    // generate bulk data
    const operations = items.map(item => {
      const filter = (keyId in item) ? { [keyId]: item[keyId] } : {};
      if (item?.deleted) {
        return { deleteOne: { filter } }
      } else {
        return { updateOne: { filter, update: { $set: item }, upsert: true } }
      }
    })
    // insert data
    const bulkResponse = await client.db().collection(activeIndexName).bulkWrite(operations, { ordered: false })
      .catch(error => ({ error }));
    // bulk error
    if (bulkResponse?.error) {
      logger.error(`MongoIndexer (2/5)[insert-data] bulk - ${bulkResponse?.error} (index: ${activeIndexName}, offset: ${offset})`);
    }
    // run next batch
    return await insertData(offset + items.length, bulkResponse);
  };
 
  const resInsertData = await insertData();

  // step logger
  if (resInsertData) {
    logger.info(`MongoIndexer (2/5)[insert-data] succeeded! (index: ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (2/5)[insert-data] failed! (index: ${activeIndexName})`);
    return { error: "INSERT_DATA_FAILED" };
  }
  
  /*
   * Test callback (step 3)
   */
  const resTestCallback = await testCallback?.({ index, activeIndexName })
    ?.catch(error => ({ error }));
  
  // step logger
  if (resTestCallback?.error !== false) {
    logger.info(`MongoIndexer (3/5)[test-data] succeeded! (index: ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (3/5)[test-data] failed! - ${resTestCallback?.error?.toString?.()} (index: ${activeIndexName})`);
    return { error: "TEST_DATA_FAILED" };
  }

  /*
   * Update/Remove aliases (step 4)
   */
  logger.debug('MongoIndexer (4/5)[update-aliases] start!', { namespace: 'MongoIndexer', index, mode, activeIndexName });
   
  const res1 = lastIndexName && await client.db().renameCollection(index, `${activeIndexName}--draf`).catch((error) => ({ error }));
  const res2 = (activeIndexName !== index) && await client.db().renameCollection(activeIndexName, index).catch((error) => ({ error }));
  const res3 = lastIndexName && await client.db().renameCollection(`${activeIndexName}--draf`, `${activeIndexName}`).catch((error) => ({ error }));
  const error = res1?.error?.toString() || res2?.error?.toString() || res3?.error?.toString();
  
  logger.debug('MongoIndexer (4/5)[update-aliases] end!', { namespace: 'MongoIndexer', index, mode, activeIndexName, error });
  
  // step logger
  if (!error) {
    logger.info(`MongoIndexer (4/5)[update-aliases] succeeded! (alias: ${index}, index: ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (4/5)[update-aliases] failed! - ${error} (alias: ${index}, index: ${activeIndexName})`);
    return { error: "UPDATE_ALIASES_FAILED" };
  }
  
  /*
   * Remove old indices (step 5)
   */
  logger.debug('MongoIndexer (5/5)[remove-indices] start!', { namespace: 'MongoIndexer', index, mode, activeIndexName });
  // load indices of the alias
  const indicesData = (await client.db().listCollections({}, { nameOnly: true }).toArray())
    ?.map(i => i.name)
    ?.filter(name => name.startsWith(`${index}---`));
  // sort by time & split the list of keep
  const removeIndices = sortByTime(indicesData).splice(keepAliasesCount);
  // remove old indexes  
  const resRemoveIndices = await Promise.all(
    removeIndices?.map(key => client.db().dropCollection(key) )
  ).catch(error => ({ error }));
  logger.debug('MongoIndexer (5/5)[remove-old-indices] end!', { namespace: 'MongoIndexer', index, mode, activeIndexName, indicesData, removeIndices });

  // step logger
  if (!resRemoveIndices?.error) {
    logger.info(`MongoIndexer (5/5)[remove-old-indices] succeeded! (alias: ${index}, index: ${activeIndexName})`);
  } else {
    logger.error(`MongoIndexer (5/5)[remove-old-indices] failed! - ${resRemoveIndices?.error?.toString?.()} (alias: ${index}, index: ${activeIndexName})`);
    return { error: "REMOVE_OLD_INDICES_FAILED" };
  }
  
  return { error: false };

};
