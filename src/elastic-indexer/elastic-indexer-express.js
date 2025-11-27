/**
 * Elastic Indexer Express
 * @function ElasticIndexerExpress
 * @modules [@elastic/elasticsearch@^9 pino@^10]
 * @envs [ELASTIC_INDEXER_PATH, ELASTICSEARCH_URL, LOG_SERVICE_NAME]
 * @param {object} the express app
 * @param {object} options {
 *   ELASTIC_INDEXER_PATH,    // the api docs route (default: /elastic-indexer)
 *   configs: [{     // {null|array}
 *     ELASTICSEARCH_URL, // the elastic service url (http[s]://[host][:port])
 *     index,      // {string} the elastic alias name
 *     mappings,   // {null|object} the elastic mappings (neets for create/clone index)
 *     settings,   // {null|object} the elastic settings (neets for create/clone index)
 *     bulk,       // {null|object} the elastic bulk options (neets for routing and more)
 *     keyId,      // {null|string} the elastic doc key (neets for update a doc)
 *     mode,       // {null|enum:new,clone,sync} "new" is using a new empty index, "clone" is using a clone of the last index, "sync" is using the current index. (default: "new") 
 *     keepAliasesCount,  // {null|number} how many elastic index passes to save
 *   }],
 *   batchCallback, // async (offset, config, reports) => ([])
 *   testCallback,  // async (config, reports) => true
 * }
 * @return {promise:object} the reports data
 * @routes {
 *   [post] [ELASTIC_INDEXER_PATH]/build/:indexName
 *   [post] [ELASTIC_INDEXER_PATH]/stop/:indexName
 *   [post] [ELASTIC_INDEXER_PATH]/restore/:indexName/:backup
 *   [get]  [ELASTIC_INDEXER_PATH]/backups/:indexName
 *   [get]  [ELASTIC_INDEXER_PATH]/search?:indexName?:text?:from?:size?
 * }
 * @example 
 * ElasticIndexerExpress(app, {
 *   configs: [{
 *     ELASTICSEARCH_URL: 'http://localhost:9200',
 *     index: 'test',
 *   }],
 *   batchCallback: async (offset, config, reports) => !offset && [{ count: 1 }, { count: 2 }],
 * });
 * // Or with auth
 * app.use('/admin', passport.authenticate('...'));
 * ElasticIndexerExpress(app, {
 *   ELASTIC_INDEXER_PATH: '/admin/elastic-indexer',
 *   ...
 * });
 */

export async function ElasticIndexerExpress(app, { ELASTIC_INDEXER_PATH = process.env.ELASTIC_INDEXER_PATH || '/elastic-indexer', index, mappings, settings, bulkOptions, keyId, mode, keepAliasesCount, batchCallback, ...options }, testCallback) {

  /*
   * Imports
   */
  const { ElasticIndexer } = await import('./elastic-indexer.js');
  const { ElasticIndexerRestore } = await import('./elastic-indexer-restore.js');
  const { ElasticIndexerBackups } = await import('./elastic-indexer-backups.js');
  // const { ElasticClient } = await import('../services/elastic-client.js');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`ElasticIndexerExpress [setup] options`, { index, mappings, settings, bulkOptions, keyId, mode, keepAliasesCount, ...options });

  const inProcess = {};

  /**
   * Build action
   * @param {string} indexName
   */
  app.post(`${ELASTIC_INDEXER_PATH}/build/:indexName`, async (req, res) => {
    // set inProcess
    inProcess[req.params.indexName] = true;
    // start chunk
    const intervalId = setInterval(() => res.write(`{ status: 'start' }`), 500);
    // run
    await ElasticIndexer(
      config, // eslint-disable-line no-undef
      (offset, config) => {
        res.write(`{ offset: ${offset} }`);
        return !!(inProcess[req.params.indexName]) && batchCallback(offset, config);
      },
      async (config) => {
        if (!inProcess[req.params.indexName]) {
          res.write(`{ status: 'stop' }`);
          return false;
        }
        else if (!testCallback || await testCallback?.(config)) {
          res.write(`{ status: 'success' }`)
          return true;
        } else {
          res.write(`{ status: 'failed' }`);
          return false;
        }
      }
    );
    delete inProcess[req.params.indexName];
    clearInterval(intervalId);
    res.end();
  })

  /**
   * Stop action
   */
  app.post(`${ELASTIC_INDEXER_PATH}/stop/:indexName`, async (req, res) => {
    inProcess[req.params.indexName] = false;
    res.json({ ok: true });
  })

  /**
   * Restore action
   */
  app.post(`${ELASTIC_INDEXER_PATH}/restore/:indexName/:backup`, async (req, res) => {
    await ElasticIndexerRestore({
      ...options,
      index: req.params.indexName,
      backupIndex: req.params.backup,
    })
      .then(data => res.json(data))
      .catch(error => res.status(400).json(error));
  })

  /**
   * Backups list
   */
  app.get(`${ELASTIC_INDEXER_PATH}/backups/:indexName`, async (req, res) => {
    const { indices, actives } = await ElasticIndexerBackups({ ...options, index: req.params.indexName });
    res.json({ indices, actives });
  })

  /**
   * Search data
   */
  // app.get(`${ELASTIC_INDEXER_PATH}/search?:indexName?:text?:from?:size?`, async (req, res) => {
  //   const client = await ElasticClient(options);
  //   const adaptarIn = (obj) => (client?.name == "opensearch-js") ? { body: obj } : obj;
  //   (await ElasticClient(options))
  //     .search({
  //       index: req.query.indexName,
  //       from: req.query.from || 0,
  //       size: req.query.size || 100,
  //       ...adaptarIn({ query: { query_string: { query: req.query.text || '*' } } })
  //     })
  //     .then(data => res.json(data))
  //     .catch(error => res.status(400).json(error));
  // })

  logger.info(`ElasticIndexerExpress [setup] starting! (path: ${ELASTIC_INDEXER_PATH}/...)`);

}
