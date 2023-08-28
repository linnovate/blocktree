import { ElasticClient } from '../services/elastic-client.js';
import { Logger } from '../utils/logger.js';

/**
 * Elastic Indexer.
 * @function ElasticIndexer
 * @modules [@elastic/elasticsearch@^8 pino@^8]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic host
     index,      // {string} the elastic alias name
     mappings,   // {null|object} the elastic mappings (neets for create/clone index)
     settings,   // {null|object} the elastic settings (neets for create/clone index)
     bulk,       // {null|object} the elastic bulk options (neets for routing and more)
     keyId,      // {null|string} the elastic doc key (neets for update a doc)
     updateOnly, // {null|bool} update parts of items (using a clone index)
     syncOnly,   // {null|bool} update parts of items (using the same index)
     keepAliasesCount,  // {null|number} how many elastic index passes to save
   }
 * @param {function} async batchCallback(offset, config)
 * @param {function} async testCallback(config)
 * @return {bool} is done
 * @example const isDone = await ElasticIndexer(config, async (offset, config) => [], async (config) => true);
 */
export async function ElasticIndexer(config, batchCallback, testCallback) {

  const logger = await Logger();

  function getIndexTime(indexName) {
    indexName = indexName
      .replace(`${config.index}---`, '')
      .replaceAll("_", " ")
      .replaceAll("-", ":")
    return new Date(indexName).getTime()
  }

  try {

    /*
     * Get elastic instance
     */
    const client = await ElasticClient({ ELASTICSEARCH_URL: config.ELASTICSEARCH_URL });

    /*
     * Create index (step 1)
     */
    // create name
    const timeFormat = new Date().toLocaleString("en-GB")
      .replaceAll("/", ".")
      .replaceAll(", ", "_")
      .replaceAll(":", "-");

    config.indexName = `${config.index}---${timeFormat}`;

    // get aliases
    const indexAliases = await client.indices.getAlias({ name: config.index }).catch(() => ({}));

    const lastIndex = Object.keys(indexAliases).sort((a, b) => getIndexTime(b) - getIndexTime(a)).reverse()[0];

    // sync mode
    if (lastIndex && config.syncOnly) {
      config.indexName = lastIndex;
      logger.info('ElasticIndexer [index mode] syncOnly', { alias: config.index, index: config.indexName });
    }
    // update mode
    else if (lastIndex && config.updateOnly) {
      await client.reindex({
        source: { index: lastIndex },
        dest: { index: config.indexName },
      });
      logger.info('ElasticIndexer [index mode] updateOnly', { alias: config.index, index: config.indexName });
    }
    // new mode
    else {
      await client.indices.create({
        index: config.indexName,
        mappings: config.mappings,
        settings: config.settings,
      });
      logger.info('ElasticIndexer [index mode] create', { alias: config.index, index: config.indexName });
    }

    /*
     * Insert data (step 2)
     */
    const offset = await insertData(config, batchCallback);

    /*
     * Test callback (step 3)
     */
    if (testCallback) {
      if (testCallback(config)) {
        // logger
        logger.info('ElasticIndexer [test] succeeded', { alias: config.index, index: config.indexName });
      } else {
        // logger
        logger.error('ElasticIndexer [test] failed', { alias: config.index, index: config.indexName });
        // skip update alias
        return false;
      }
    }

    /*
     * Skip aliases (syncOnly mode)
     */
    if (lastIndex && config.syncOnly) {
      return true;
    }
    
    /*
     * Update alias (step 4)
     */

    // load indices of the alias
    const removeAliases = await client.indices.getAlias({ name: config.index }).catch(data => ({}));

    // create actions - update alias
    const actions = [{ add: { index: config.indexName, alias: config.index } }];

    // create actions - remove old indices
    Object.keys(removeAliases).forEach(index => {
      actions.push({ remove: { index, alias: config.index } });
    });

    // update aliases
    await client.indices.updateAliases({ body: { actions } });

    logger.info('ElasticIndexer [aliases] succeeded', { alias: config.index, index: config.indexName, removeAliases: Object.keys(removeAliases) });

    /*
     * Remove old indices (step 5)
     */

    // load indices of the alias
    const indicesData = await client.indices.get({ index: `${config.index}---*` }).catch(data => ({}));

    // ignore active index
    delete indicesData[config.indexName];

    // sort by name date
    const indicesList = Object.keys(indicesData).sort((a, b) => getIndexTime(b) - getIndexTime(a)).reverse();

    // split the list of keep & remove indices
    const keepIndices = indicesList;
    const removeIndices = keepIndices.splice(config.keepAliasesCount ?? 1);

    // delete old indexes
    for (let i = 0; i < removeIndices.length; i++) {
      await client.indices.delete({ index: removeIndices[i], allow_no_indices: true })
        .then(() => {
          logger.info('ElasticIndexer [remove index] succeeded', { alias: config.index, index: removeIndices[i], keepIndices });
        })
        .catch((error) => {
          logger.error('ElasticIndexer [remove index] failed', { alias: config.index, index: removeIndices[i], keepIndices, error: error?.toString() });
        });
    }

    return true;

  } catch (error) {
    logger.error('ElasticIndexer [error]', { alias: config.index, error: error?.toString() });
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
   * Load items (step 1)
   */
  const items = await batchCallback(offset, config)
    .then((items) => {
      logger.info('ElasticIndexer [batch callback] succeeded', { alias: config.index, index: config.indexName, offset, count: items?.length });
      return items;
    })
    .catch((error) => {
      logger.error('ElasticIndexer [batch callback] failed', { alias: config.index, index: config.indexName, offset, error: error?.toString() });
    });

  // no items
  if (!items?.length) {
    return offset;
  }

  /*
   * Insert items (step 2)
   */
  const operations = items.flatMap(item => [{
    [item.delete ? 'delete' : 'index']: { // set create/update/delete
      _index: config.indexName,
      _id: item[config.keyId || 'id'], // create/update
      ...config.bulk,
    }
  }, item]);

  // get elastic instance
  const client = await ElasticClient({ ELASTICSEARCH_URL: config.ELASTICSEARCH_URL });

  // create items
  const response = await client.bulk({ operations, refresh: true });

  /*
   * Print Logs (step 3)
   */
  if (response.errors) {
    const errors = response.items.map(i => i.index.error)
    logger.error('ElasticIndexer [batch inserting] error', { alias: config.index, index: config.indexName, offset, count: items?.length, errors });
  }
  else {
    const logs = response.items.map(item => ({
      _id: item.index._id,
      action: item.index.result,
    }))
    logger.info('ElasticIndexer [batch inserting] succeeded', { alias: config.index, index: config.indexName, offset, count: items?.length, logs });
  }

  /*
   * Run Next batch (step 4)
   */
  return await insertData(config, batchCallback, offset + items.length);

}


/**
 * Restore Elastic Indexer.
 * @function RestoreElasticIndexer
 * @modules [@elastic/elasticsearch@^8 pino@^8 pino-pretty@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic host
     aliasName,      // {string} the elastic alias name
     indexName,      // {string} the elastic index name
     lastIndexCount: // {number} the count of lasts elastic index
   }
 * @param {function} async testCallback(config)
 * @return {bool} is done
 * @example const isDone = await RestoreElasticIndexer({ ELASTICSEARCH_URL, aliasName, indexName }, async (config) => true);
 */
export async function RestoreElasticIndexer({ ELASTICSEARCH_URL, aliasName, indexName, lastIndexCount }) {

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
     * Get elastic instance
     */
    const client = await ElasticClient({ ELASTICSEARCH_URL });

    /*
     * Fine index
     */
    if (lastIndexCount) {
      
      // load indices of the alias
      const indicesData = await client.indices.get({ index: `${aliasName}---*` }).catch(data => ({}));
  
      // sort by name date
      const indicesList = Object.keys(indicesData).sort((a, b) => getIndexTime(b) - getIndexTime(a));
  
      indexName = indicesList[Math.hypot(lastIndexCount)];
    }
    
    /*
     * Update alias
     */
    
    // load indices of the alias
    const aliases = await client.indices.getAlias({ name: aliasName }).catch(data => ({}));

    delete aliases[indexName];

    // create actions - update alias
    const actions = [{ add: { index: indexName, alias: aliasName } }];

    // create actions - remove old indices
    Object.keys(aliases).forEach(index => {
      actions.push({ remove: { index, alias: aliasName } });
    });

    // update aliases
    await client.indices.updateAliases({ body: { actions } })
      .then(() => {
        logger.info('RestoreElasticIndexer [aliases] succeeded', { aliasName, indexName, aliases: Object.keys(aliases) });
      })
      .catch((error) => {
        logger.error('RestoreElasticIndexer [aliases] failed', { aliasName, indexName, aliases: Object.keys(aliases), error: error?.toString() });
      });

    return true;

  } catch (error) {
    logger.error('RestoreElasticIndexer [error]', { aliasName, indexName, error: error?.toString() });
  }

};
