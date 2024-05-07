import { ElasticIndexer, RestoreElasticIndexer, ElasticIndexerBackups } from '../tools/elastic-indexer.js';
import { ElasticClient } from '../services/elastic-client.js';

/**
 * Elastic Indexer Express
 * @function ElasticIndexerExpress
 * @modules [@elastic/elasticsearch@^8 pino@^8]
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

export async function ElasticIndexerExpress(app, options) {

  // envs
  options.ELASTIC_INDEXER_PATH ??= process.env.ELASTIC_INDEXER_PATH || '/elastic-indexer';

  const inProcess = {};

  /**
   * Build action
   * @route [ELASTIC_INDEXER_PATH]/build/:indexName [post]
   */
  app.post(`${options.ELASTIC_INDEXER_PATH}/build/:indexName`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.index == req.params.indexName);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // set inProcess
    inProcess[config.index] = true;
    // start chunk
    const intervalId = setInterval(() => res.write(`{ status: 'start' }`), 500);
    // run
    const reports = await ElasticIndexer(
      config,
      (offset, config, reports) => {
        res.write(`{ offset: ${offset} }`);
        return !!(inProcess[config.index]) && options.batchCallback(offset, config, reports);
      },
      async (config, reports) => {
        if (!inProcess[config.index]) {
          res.write(`{ status: 'stop' }`);
          return false;
        }
        else if (!options.testCallback || await options.testCallback?.(config, reports)) {
          res.write(`{ status: 'success' }`)
          return true;
        } else {
          res.write(`{ status: 'failed' }`);
          return false;
        }
      }
    );
    console.log(reports)

    // is error
    if (!reports['succeeded']) {
      res.status(500);
    }
    // end
    delete inProcess[config.index];
    clearInterval(intervalId);
    res.write(`{ reports: ${JSON.stringify(reports)} }`)
    res.end();
  })

  /**
   * Stop action
   * @route [ELASTIC_INDEXER_PATH]/stop/:indexName [post]
   */
  app.post(`${options.ELASTIC_INDEXER_PATH}/stop/:indexName`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.index == req.params.indexName);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // run    
    inProcess[config.index] = false;
    // send
    res.json({ ok: true });
  })

  /**
   * Restore action
   * @route [ELASTIC_INDEXER_PATH]/restore/:indexName/:backup [post]
   */
  app.post(`${options.ELASTIC_INDEXER_PATH}/restore/:indexName/:backup`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.index == req.params.indexName);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // run
    const success = await RestoreElasticIndexer({
      ELASTICSEARCH_URL: config.ELASTICSEARCH_URL,
      aliasName: req.params.indexName,
      indexName: req.params.backup
    })
    // send
    res.json({ success });
  })

  /**
   * Backups list
   * @route [ELASTIC_INDEXER_PATH]/backups/:indexName [get]
   */
  app.get(`${options.ELASTIC_INDEXER_PATH}/backups/:indexName`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.index == req.params.indexName);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // run
    const { data, actives } = await ElasticIndexerBackups({
      ELASTICSEARCH_URL: config.ELASTICSEARCH_URL,
      aliasName: req.params.indexName,
    })
    // send
    res.json({ ok: true, data, actives });
  })

  /**
   * Search data
   * @route [ELASTIC_INDEXER_PATH]/search?:indexName?:text?:from?:size? [get]
   */
  app.get(`${options.ELASTIC_INDEXER_PATH}/search?:indexName?:text?:from?:size?`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.index == req.query.indexName?.split('---')[0]);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // run
    const client = await ElasticClient({ ELASTICSEARCH_URL: config.ELASTICSEARCH_URL });
    await client.search({
      index: req.query.indexName,
      from: req.query.from || 0,
      size: req.query.size || 100,
      query: { query_string: { query: req.query.text || '*' } }
    })
      .then((data) => {
        res.json({ ok: true, data });
      })
      .catch(error => {
        res.status(400).json({ ok: false, error });
      });

  })

}
