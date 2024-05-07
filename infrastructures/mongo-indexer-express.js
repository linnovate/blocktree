import { MongoIndexer, RestoreMongoIndexer, MongoIndexerBackups } from '../tools/mongo-indexer.js';
import { MongoClient } from '../services/mongo-client.js';

/**
 * Mongo Indexer Express
 * @function MongoIndexerExpress
 * @modules [mongodb@^6 pino@^8]
 * @envs [MONGO_INDEXER_PATH, MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} the express app
 * @param {object} options {
 *   MONGO_INDEXER_PATH,    // the api docs route (default: /elastic-indexer)
 *   configs: [{     // {null|array}
 *     MONGO_URI,       // the mongo service uri (mongodb://[user]:[pass]@[host]:[port]/[db_name]?authSource=admin)
 *     collectionName,  // {null|string} the mongo collection name
 *     keyId,           // {null|string} the mongo doc key
 *     mode,            // {null|enum:new,clone,sync} "new" is using a new empty index, "clone" is using a clone of the last index, "sync" is using the current index. (default: "new") 
 *     keepAliasesCount,  // {null|number} how many elastic index passes to save
 *     mongoClientOptions,
 *   }],
 *   batchCallback, // async (offset, config, reports) => ([])
 *   testCallback,  // async (config, reports) => true
 * }
 * @return {promise:object} the reports data
 * @routes {
 *   [post] [MONGO_INDEXER_PATH]/build/:collectionName
 *   [post] [MONGO_INDEXER_PATH]/stop/:collectionName
 *   [post] [MONGO_INDEXER_PATH]/restore/:collectionName/:backup
 *   [get]  [MONGO_INDEXER_PATH]/backups/:collectionName
 *   [get]  [MONGO_INDEXER_PATH]/search?:collectionName?:text?:from?:size?
 * }
 * @example 
 * MongoIndexerExpress(app, {
 *   configs: [{
 *     MONGO_URI: 'mongodb://root:root@localhost:27017/test?authSource=admin',
 *     collectionName: 'items',
 *   }],
 *   batchCallback: async (offset, config, reports) => !offset && [{ count: 1 }, { count: 2 }],
 * });
 * // Or with auth
 * app.use('/admin', passport.authenticate('...'));
 * MongoIndexerExpress(app, {
 *   MONGO_INDEXER_PATH: '/admin/mongo-indexer',
 *   ...
 * });
 */

export async function MongoIndexerExpress(app, options) {

  // envs
  options.MONGO_INDEXER_PATH ??= process.env.MONGO_INDEXER_PATH || '/elastic-indexer';

  const inProcess = {};

  /**
   * Build action
   * @route [MONGO_INDEXER_PATH]/build/:collectionName [post]
   */
  app.post(`${options.MONGO_INDEXER_PATH}/build/:collectionName`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.collectionName == req.params.collectionName);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // set inProcess
    inProcess[config.collectionName] = true;
    // start chunk
    const intervalId = setInterval(() => res.write(`{ status: 'start' }`), 500);
    // run
    const reports = await MongoIndexer(
      config,
      (offset, config, reports) => {
        res.write(`{ offset: ${offset} }`);
        return !!(inProcess[config.collectionName]) && options.batchCallback(offset, config, reports);
      },
      async (config, reports) => {
        if (!inProcess[config.collectionName]) {
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
    delete inProcess[config.collectionName];
    clearInterval(intervalId);
    res.write(`{ reports: ${JSON.stringify(reports)} }`)
    res.end();
  })

  /**
   * Stop action
   * @route [MONGO_INDEXER_PATH]/stop/:collectionName [post]
   */
  app.post(`${options.MONGO_INDEXER_PATH}/stop/:collectionName`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.collectionName == req.params.collectionName);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // run    
    inProcess[config.collectionName] = false;
    // send
    res.json({ ok: true });
  })

  /**
   * Restore action
   * @route [MONGO_INDEXER_PATH]/restore/:collectionName/:backup [post]
   */
  app.post(`${options.MONGO_INDEXER_PATH}/restore/:collectionName/:backup`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.collectionName == req.params.collectionName);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // run
    const success = await RestoreMongoIndexer({
      MONGO_URI: config.MONGO_URI,
      aliasName: req.params.collectionName,
      indexName: req.params.backup
    })
    // send
    res.json({ success });
  })

  /**
   * Backups list
   * @route [MONGO_INDEXER_PATH]/backups/:collectionName [get]
   */
  app.get(`${options.MONGO_INDEXER_PATH}/backups/:collectionName`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.collectionName == req.params.collectionName);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // run
    const { data, actives } = await MongoIndexerBackups({
      MONGO_URI: config.MONGO_URI,
      aliasName: req.params.collectionName,
    })
    // send
    res.json({ ok: true, data, actives });
  })

  /**
   * Search data
   * @route [MONGO_INDEXER_PATH]/search?:collectionName?:text?:from?:size? [get]
   */
  app.get(`${options.MONGO_INDEXER_PATH}/search?:collectionName?:text?:from?:size?`, async (req, res) => {
    // find config
    const config = options.configs?.find(i => i.collectionName == req.query.collectionName?.split('---')[0]);
    if (!config) {
      return res.status(400).json({ error: 'NOT_FOUND' });
    }
    // run
    const db = await (await MongoClient(config.MONGO_URI, config.mongoClientOptions)).db();
    await db.collection(req.query.collectionName).find(
      { $text: { $search: req.query.text } },
      {},
      { from: req.query.from || 0, size: req.query.size || 100 }
    )
      .then((data) => {
        res.json({ ok: true, data });
      })
      .catch(error => {
        res.status(400).json({ ok: false, error });
      });

  })

}
