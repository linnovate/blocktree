import { ElasticClient } from '../services/elastic-client.js';
import { Logger } from '../utils/logger.js';

/**
 * Elastic Indexer.
 * @function ElasticIndexer
 * @modules [@elastic/elasticsearch@^8 pino@^8]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic service url (http[s]://[host][:port])
     index,      // {string} the elastic alias name
     mappings,   // {null|object} the elastic mappings (neets for create/clone index)
     settings,   // {null|object} the elastic settings (neets for create/clone index)
     bulk,       // {null|object} the elastic bulk options (neets for routing and more)
     keyId,      // {null|string} the elastic doc key (neets for update a doc) (default: "id")
     mode,       // {null|enum:new,clone,sync} "new" is using a new empty index, "clone" is using a clone of the last index, "sync" is using the current index. (default: "new") 
     keepAliasesCount,  // {null|number} how many elastic index passes to save
   }
 * @param {function} async batchCallback(offset, config, reports)
 * @param {function} async testCallback(config, reports)
 * @return {promise:object} the reports data
 * @example const reports = await ElasticIndexer(config, async (offset, config, reports) => [], async (config, reports) => true);
 * @dockerCompose
  # Elastic service
  elastic:
    image: elasticsearch:8.5.3
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
export async function ElasticIndexer(config, batchCallback, testCallback) {

  const logger = await Logger();
  const reports = {};

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
    const timeFormat = new Date().toLocaleString('en', { hour12: false })
      .replaceAll("/", ".")
      .replaceAll(", ", "_")
      .replaceAll(":", "-");

    config.indexName = `${config.index}---${timeFormat}`;

    // get aliases
    const indexAliases = await client.indices.getAlias({ name: config.index }).catch(() => ({}));

    const lastIndex = Object.keys(indexAliases).sort((a, b) => getIndexTime(b) - getIndexTime(a)).reverse()[0];

    // sync mode
    if (lastIndex && config.mode == 'sync') {
      config.indexName = lastIndex;
      logger.info('ElasticIndexer [mode] sync', { alias: config.index, index: config.indexName });
    }
    // update mode
    else if (lastIndex && config.mode == 'clone') {
      await client.reindex({
        source: { index: lastIndex },
        dest: { index: config.indexName },
      });
      logger.info('ElasticIndexer [mode] clone', { alias: config.index, index: config.indexName });
    }
    // new mode
    else {
      await client.indices.create({
        index: config.indexName,
        mappings: config.mappings,
        settings: config.settings,
      });
      logger.info('ElasticIndexer [mode] new', { alias: config.index, index: config.indexName });
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
          logger.info('ElasticIndexer [testing] succeeded', { alias: config.index, index: config.indexName });
          return true;
        })
        .catch((error) => {
          logger.error('ElasticIndexer [testing] failed', { alias: config.index, index: config.indexName, error: error?.toString() });
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

    reports["removeAliases"] = Object.keys(removeAliases);

    /*
     * Remove old indices (step 5)
     */
    // load indices of the alias
    const indicesData = await client.indices.get({ index: `${config.index}---*` }).catch(data => ({}));

    // ignore active index
    delete indicesData[config.indexName];

    // sort by date
    const keepIndices = Object.keys(indicesData).sort((a, b) => getIndexTime(b) - getIndexTime(a));

    // split the list of keep & remove indices
    const removeIndices = keepIndices.splice(config.keepAliasesCount ?? 1);

    reports["keepIndices"] = keepIndices;
    reports["removeIndices"] = {};

    // delete old indexes
    for (let i = 0; i < removeIndices.length; i++) {
      await client.indices.delete({ index: removeIndices[i], allow_no_indices: true })
        .then(() => {
          logger.info('ElasticIndexer [remove index] succeeded', { alias: config.index, index: removeIndices[i], keepIndices });
          reports["removeIndices"][removeIndices[i]] = true;
        })
        .catch((error) => {
          logger.error('ElasticIndexer [remove index] failed', { alias: config.index, index: removeIndices[i], keepIndices, error: error?.toString() });
          reports["removeIndices"][removeIndices[i]] = error?.toString();
        });
    }

    reports["succeeded"] = true;

  }
  catch (error) {
    logger.error('ElasticIndexer [error]', { alias: config.index, error: error?.toString() });
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
      logger.info('ElasticIndexer [batch callback] succeeded', { alias: config.index, index: config.indexName, offset, count: items?.length });
      reports["insertData"][offset]["callback_succeeded"] = true;
      return items;
    })
    .catch((error) => {
      logger.error('ElasticIndexer [batch callback] failed', { alias: config.index, index: config.indexName, offset, error: error?.toString() });
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
    reports["insertData"][offset]["inserting_errors"] = errors;
  }
  else {
    const logs = response.items.map(item => ({
      [config.keyId || 'id']: item.index[config.keyId || 'id'],
      action: item.index.result,
    }))
    logger.info('ElasticIndexer [batch inserting] succeeded', { alias: config.index, index: config.indexName, offset, count: items?.length, logs });
    reports["insertData"][offset]["inserting_succeeded"] = true;
  }

  /*
   * Run Next batch (step 4)
   */
  return await insertData(config, batchCallback, reports, offset + items.length);

}


/**
 * Restore Elastic Indexer.
 * @function RestoreElasticIndexer
 * @modules [@elastic/elasticsearch@^8 pino@^8 pino-pretty@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic host (http[s]://[host][:port])
     aliasName,      // {string} the elastic alias name
     indexName,      // {string} the elastic index name
     lastIndexCount: // {number} the count of lasts elastic index
   }
 * @return {bool} is done
 * @example const isDone = await RestoreElasticIndexer({ ELASTICSEARCH_URL, aliasName, indexName });
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
     * Find index
     */
    if (lastIndexCount) {

      // load indices of the alias
      const indicesData = await client.indices.get({ index: `${aliasName}---*` }).catch(data => ({}));

      // sort by date
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


/**
 * Elastic Indexer Backups.
 * @function ElasticIndexerBackups
 * @modules [@elastic/elasticsearch@^8 pino@^8 pino-pretty@^10]
 * @envs [ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} {
     ELASTICSEARCH_URL, // the elastic host (http[s]://[host][:port])
     aliasName,         // {string} the elastic alias name
   }
 * @return {object} { data, actives }
 * @example const backupsList = await ElasticIndexerBackups({ ELASTICSEARCH_URL, aliasName });
 */
export async function ElasticIndexerBackups({ ELASTICSEARCH_URL, aliasName }) {

  function getIndexTime(indexName) {
    indexName = indexName
      .replace(`${aliasName}---`, '')
      .replaceAll("_", " ")
      .replaceAll("-", ":")
    return new Date(indexName).getTime()
  }

  // Get elastic instance
  const client = await ElasticClient({ ELASTICSEARCH_URL });

  // Load indices of the alias
  const indicesData = await client.indices.get({ index: `${aliasName}---*` }).catch(data => ({}));

  // sort by date
  const data = Object.keys(indicesData).sort((a, b) => getIndexTime(b) - getIndexTime(a));

  const actives = Object.keys(indicesData).filter(key => !!indicesData[key].aliases[aliasName]);

  return { data, actives };

};
