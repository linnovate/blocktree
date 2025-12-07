/**
 * Elastic Indexer.
 * @function ElasticIndexer
 * @modules [@elastic/elasticsearch@^9|@opensearch-project/opensearch@^3 pino@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic service url (http[s]://[host][:port])
     index,      // {string} the elastic alias name
     mappings,   // {null|object} the elastic mappings (neets for create/clone index)
     settings,   // {null|object} the elastic settings (neets for create/clone index)
     bulkOptions,// {null|object} the elastic bulk options (neets for routing and more)
     keyId,      // {null|string} the elastic doc key (neets for update a doc) (default: 'id')
     mode,       // {null|enum:new,clone,sync} 'new' is using a new empty index, 'clone' is using a clone of the last index, 'sync' is using the current index. (default: 'new') 
     keepAliasesCount,  // {null|number} how many elastic index passes to save
     ...options  // {null|object} the elastic options
   }
 * @param {function} async batchCallback(offset, config, reports)
 * @param {function} async testCallback(config, reports)
 * @return {promise:object} the messages { error: NO_INDEX_NAME || FIND_INDEX_FAILED || INSERT_DATA_FAILED || TEST_DATA_FAILED || UPDATE_ALIASES_FAILED ||REMOVE_OLD_INDICES_FAILED }
 * @example const reports = await ElasticIndexer(config, async (offset, config, reports) => [], async (config, reports) => true);
 * @dockerCompose
  # Elastic service
  elastic:
    image: elasticsearch:9.1.5
    volumes:
      - ./.elastic:/usr/share/elasticsearch/data
    environment:
      - 'ES_JAVA_OPTS=-Xms512m -Xmx512m'
      - 'discovery.type=single-node'
      - 'xpack.security.enabled=false'
    ports:
      - 9200:9200
      - 9300:9300
 */
export async function ElasticIndexer(
  {
    index,
    mode = 'new',
    keyId = 'id',
    mappings,
    settings,
    bulkOptions,
    keepAliasesCount = 1,
    ...options
  },
  batchCallback,
  testCallback = async () => true,
) {

  /*
   * Imports
   */
  const { ElasticClient } = await import('../services/elastic-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`ElasticIndexer [setup] options`, { namespace: 'ElasticIndexer', index, mappings, settings, bulkOptions, keyId, mode, keepAliasesCount, ...options });

  /*
   * Options
   */
  if (!index) {
    logger.error('ElasticIndexer [missing option]: index');
    return { error: "NO_INDEX_NAME" };
  }

  /*
   * Vars
   */
  const client = await ElasticClient({ logPrefix: 'ElasticIndexer:', ...options });
  const adaptarIn = (obj) => (client?.name == 'opensearch-js') ? { body: obj } : obj;
  const adaptarOut = (obj) => (client?.name == 'opensearch-js') ? obj?.body || {} : obj || {};
  const sortByTime = (obj) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll('_', ' ').replaceAll('-', ':')).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Use index (step 1)
   */
  logger.debug(`ElasticIndexer (1/5)[find-index] start! (alias: ${index})`, { namespace: 'ElasticIndexer', index, mode });
 
  // get the last indexName 
  const indexAliases = await client.indices.getAlias({ name: index }).then(data => adaptarOut(data));
  const lastIndexName = sortByTime(indexAliases).reverse()[0];

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
    resUseIndex = await client.reindex(adaptarIn({ source: { index: lastIndexName }, dest: { index: activeIndexName } }));
  }
  else {
    resUseIndex = await client.indices.create({ index: activeIndexName, ...adaptarIn({ mappings, settings }) });
  }
  
  logger.debug(`ElasticIndexer (1/5)[find-index] end! (${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`, { namespace: 'ElasticIndexer', index, mode, activeIndexName, lastIndexName, indexAliases });
  
  // step logger
  if (resUseIndex) {
    logger.info(`ElasticIndexer (1/5)[find-index] succeeded! (alias: ${index}, ${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (1/5)[find-index] failed! (alias: ${index}, ${activeIndexName != lastIndexName ? 'create:' : 'using:'} ${activeIndexName})`);
    return { error: "FIND_INDEX_FAILED" };
  }

  /*
   * Insert data (step 2)
   */
  const insertData = async (offset = 0, response) => {
    logger.debug(`ElasticIndexer (2/5)[insert-data] batch (index: ${activeIndexName}, offset: ${offset})`, { namespace: 'ElasticIndexer', index, mode, activeIndexName });
    // run batch
    const items = await batchCallback({ offset, index, mode, response }).catch((error) => ({ error }));
    // callback error
    if (items?.error) {
      logger.error(`ElasticIndexer (2/5)[insert-data] callback - ${items?.error?.toString?.()} (index: ${activeIndexName}, offset: ${offset})`);
      return false;
    }
    // end data
    else if (!items?.length) {
      return true;
    }
    // generate bulk data
    const operations = items.flatMap(item => [
      { [item.delete ? 'delete' : 'index']: { _index: activeIndexName, _id: item[keyId], ...bulkOptions } },
      item
    ]);
    // insert data
    const adaptarIn = (obj) => (client?.name == 'opensearch-js') ? { body: obj } : { operations: obj };
    const bulkResponse = await client.bulk({ index: activeIndexName, refresh: true, ...adaptarIn(operations) }).then(data => adaptarOut(data));
    // bulk error
    if (bulkResponse?.errors !== false) {
      logger.error(`ElasticIndexer (2/5)[insert-data] bulk - ${bulkResponse?.errors} (index: ${activeIndexName}, offset: ${offset})`);
    }
    // run next batch
    return await insertData(offset + items.length, bulkResponse);
  };
 
  const resInsertData = await insertData();

  // step logger
  if (resInsertData) {
    logger.info(`ElasticIndexer (2/5)[insert-data] succeeded! (index: ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (2/5)[insert-data] failed! (index: ${activeIndexName})`);
    return { error: "INSERT_DATA_FAILED" };
  }

  /*
   * Test callback (step 3)
   */
  const resTestCallback = await testCallback?.({ index, activeIndexName })
    ?.catch(error => ({ error }));
  
  // step logger
  if (resTestCallback?.error !== false) {
    logger.info(`ElasticIndexer (3/5)[test-data] succeeded! (index: ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (3/5)[test-data] failed! - ${resTestCallback?.error?.toString?.()} (index: ${activeIndexName})`);
    return { error: "TEST_DATA_FAILED" };
  }

  /*
   * Update/Remove aliases (step 4)
   */
  let resUpdateAliases;
  if (lastIndexName && mode != 'sync') {
    logger.debug('ElasticIndexer (4/5)[update-aliases] start!', { namespace: 'ElasticIndexer', index, mode, activeIndexName });
    // load index aliases
    const removeAliases = await client.indices.getAlias({ name: index }).then(data => adaptarOut(data));
    // add new alias & remove old alias
    resUpdateAliases = await client.indices.updateAliases({
      body: {
        actions: [
          { add: { index: activeIndexName, alias: index } },
          ...Object.keys(removeAliases).map(key => ({ remove: { index: key, alias: index } })),
        ]
      }
    });
    logger.debug('ElasticIndexer (4/5)[update-aliases] end!', { namespace: 'ElasticIndexer', index, mode, res: resUpdateAliases, activeIndexName, removeAliases });
  }
  
  // step logger
  if (resUpdateAliases?.error !== false) {
    logger.info(`ElasticIndexer (4/5)[update-aliases] succeeded! (alias: ${index}, index: ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (4/5)[update-aliases] failed! - ${resUpdateAliases?.error?.toString?.()} (alias: ${index}, index: ${activeIndexName})`);
    return { error: "UPDATE_ALIASES_FAILED" };
  }
  
  /*
   * Remove old indices (step 5)
   */
  logger.debug('ElasticIndexer (5/5)[remove-indices] start!', { namespace: 'ElasticIndexer', index, mode, activeIndexName });
  // load indices of the alias
  const indicesData = await client.indices.get({ index: `${index}---*` }).then(data => adaptarOut(data));
  // ignore active index
  delete indicesData[activeIndexName];
  // sort by time & split the list of keep
  const removeIndices = sortByTime(indicesData).splice(keepAliasesCount);
  // remove old indexes
  const resRemoveIndices = await Promise.all(
    removeIndices?.map(index => client.indices.delete({ index, allow_no_indices: true }) )
  ).catch(error => ({ error }));
  logger.debug('ElasticIndexer (5/5)[remove-old-indices] end!', { namespace: 'ElasticIndexer', index, mode, activeIndexName, indicesData, removeIndices });
 
  // step logger
  if (resRemoveIndices?.error !== false) {
    logger.info(`ElasticIndexer (5/5)[remove-old-indices] succeeded! (alias: ${index}, index: ${activeIndexName})`);
  } else {
    logger.error(`ElasticIndexer (5/5)[remove-old-indices] failed! - ${resRemoveIndices?.error?.toString?.()} (alias: ${index}, index: ${activeIndexName})`);
    return { error: "REMOVE_OLD_INDICES_FAILED" };
  }
   
  return { error: false };

}
