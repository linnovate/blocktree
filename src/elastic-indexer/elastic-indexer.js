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
     keyId,      // {null|string} the elastic doc key (neets for update a doc) (default: "id")
     mode,       // {null|enum:new,clone,sync} "new" is using a new empty index, "clone" is using a clone of the last index, "sync" is using the current index. (default: "new") 
     keepAliasesCount,  // {null|number} how many elastic index passes to save
     ...options  // {null|object} the elastic options
   }
 * @param {function} async batchCallback(offset, config, reports)
 * @param {function} async testCallback(config, reports)
 * @return {promise:object} the reports data
 * @example const reports = await ElasticIndexer(config, async (offset, config, reports) => [], async (config, reports) => true);
 * @dockerCompose
  # Elastic service
  elastic:
    image: elasticsearch:9.1.5
    volumes:
      - ./.elastic:/usr/share/elasticsearch/data
    environment:
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - "discovery.type=single-node"
      - "xpack.security.enabled=false"
    ports:
      - 9200:9200
      - 9300:9300
 */
export async function ElasticIndexer({ index, mappings, settings, bulkOptions, keyId, mode, keepAliasesCount, ...options }, batchCallback, testCallback) {

  /*
   * Imports
   */
  const { ElasticClient } = await import('../services/elastic-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`ElasticIndexer [setup] options`, { index, mappings, settings, bulkOptions, keyId, mode, keepAliasesCount, ...options });

  /*
   * Options
   */
  if (!index) {
    return logger.error('ElasticIndexer [missing option]: index');
  }

  /*
   * Vars
   */
  const client = await ElasticClient({ logPrefix: 'ElasticIndexer:', ...options });
  const adaptarIn = (obj) => (client?.name == "opensearch-js") ? { body: obj } : obj;
  const adaptarOut = (obj) => (client?.name == "opensearch-js") ? obj?.body || {} : obj || {};
  const sortByTime = (obj) => {
    const getTime = (indexName) => new Date(indexName.replace(`${index}---`, '').replaceAll("_", " ").replaceAll("-", ":")).getTime();
    return Object.keys(obj || {}).sort((a, b) => getTime(b) - getTime(a))
  }

  /*
   * Use index (step 1)
   */
  logger.debug(`ElasticIndexer [1.find-index] start! {alias:${index}}`, { index, mode });
  // get the last indexName 
  const indexAliases = await client.indices.getAlias({ name: index }).then(data => adaptarOut(data));
  const lastIndexName = sortByTime(indexAliases).reverse()[0];
  // generate a new index name
  const timeFormat = new Date().toLocaleString('en', { hour12: false }).replaceAll("/", ".").replaceAll(", ", "_").replaceAll(":", "-");
  let activeIndexName = `${index}---${timeFormat}`;

  // create/use the active index by mode
  if (mode == 'sync' && lastIndexName) {
    activeIndexName = lastIndexName;
  }
  else if (mode == 'clone' && lastIndexName) {
    await client.reindex(adaptarIn({ source: { index: lastIndexName }, dest: { index: activeIndexName } }));
  }
  else {
    await client.indices.create({ index: activeIndexName, ...adaptarIn({ mappings, settings }) });
  }
  logger.debug(`ElasticIndexer [1.find-index] end! {${activeIndexName != lastIndexName ? "create index:" : "use index:"}${activeIndexName}}`, { index, mode, activeIndexName, lastIndexName, indexAliases });

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
    const operations = items.flatMap(item => [{ [item.delete ? 'delete' : 'index']: { _index: activeIndexName, _id: item[keyId || 'id'], ...bulkOptions } }, item]);
    // insert data
    const bulkResponse = await client.bulk({ index: activeIndexName, refresh: true, ...adaptarIn(operations) }).then(data => adaptarOut(data));
    // run next batch
    return await insertData(offset + items.length, bulkResponse);
  };

  logger.debug('ElasticIndexer [2.insert-data] start!', { index });
  const isDone = await insertData();
  logger.debug('ElasticIndexer [2.insert-data] end!', { index });

  if (!isDone) {
    return false;
  }

  /*
   * Test callback (step 3)
   */
  if (testCallback) {
    const isTestSucceeded = await testCallback(options)
      .then(() => {
        logger.info('ElasticIndexer [3.testing] succeeded', { alias: index, index: activeIndexName });
        return true;
      })
      .catch((error) => {
        logger.error('ElasticIndexer [3.testing] failed', { alias: index, index: activeIndexName, error: error?.toString() });
        return false;
      });
    if (!isTestSucceeded) {
      return false;
    }
  }
  else {
    logger.debug('ElasticIndexer [3.testing] no testing!', { index });
  }

  /*
   * Update/Remove aliases (step 4)
   */
  if (lastIndexName && mode != 'sync') {
    logger.debug('ElasticIndexer [4.update-aliases] start!', { index });
    // load index aliases
    const removeAliases = await client.indices.getAlias({ name: index }).then(data => adaptarOut(data));
    // add new alias & remove old alias
    await client.indices.updateAliases({
      body: {
        actions: [
          { add: { index: activeIndexName, alias: index } },
          ...Object.keys(removeAliases).map(index => ({ remove: { index, alias: index } })),
        ]
      }
    });
    logger.debug('ElasticIndexer [4.update-aliases] end!', { index, activeIndexName, removeAliases });
  }
  else {
    logger.debug('ElasticIndexer [4.update-aliases] no aliases!', { index });
  }

  /*
   * Remove old indices (step 5)
   */
  logger.debug('ElasticIndexer [remove-indices] start!', { index });
  // load indices of the alias
  let indicesData = await client.indices.get({ index: `${options.index}---*` }).then(data => adaptarOut(data));
  // ignore active index
  delete indicesData[activeIndexName];
  // sort by time & split the list of keep
  const removeIndices = sortByTime(indicesData).splice(options.keepAliasesCount ?? 1);
  // remove old indexes
  for (let i = 0; i < removeIndices.length; i++) {
    await client.indices.delete({ index: removeIndices[i], allow_no_indices: true })
      .then(() => {
        // logger.info('ElasticIndexer [remove index] succeeded', { alias: options.index, index: removeIndices[i], keepIndices });
      })
      .catch((error) => {
        logger.error('ElasticIndexer [remove index] failed', { alias: options.index, index: removeIndices[i], error: error?.toString() });
      });
  }
  // logger.error('ElasticIndexer [error]', { alias: options.index, error: error?.toString() });
  logger.debug('ElasticIndexer [remove-indices] end!', { index });

  return true;

}
