/**
 * Mongo Client - Singleton Mongo Client instance by service URL.
 * - Uses default envs: `MONGO_URI`.
 * - Includes comprehensive logging for request and response cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:MongoClient` or `DEBUG=blocktree`
 * 
 * @async
 * @function MongoClient
 * @requires module:mongodb@^7
 * @requires module:mongodb-memory-server@^10 (Required if `options.mock` is true)
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.MONGO_URI=process.env.MONGO_URI - Connection string (mongodb://[[username][:password]@][host][:port]). **Required** if `options.mock` is not set.
 * @param {boolean} options.mock=false - If `true`, requires and uses `module:mongodb-memory-server`. {@link https://www.npmjs.com/package/mongodb-memory-server}
 * @param {string|null} options.logPrefix - A string prefix to add to all internal log messages (e.g., `[my-service]`).
 * @param {Object|null} ...options - Additional standard `module:mongodb` options. {@link https://www.npmjs.com/package/mongodb}
 *
 * @returns {Promise<Object>} The initialized and connected Mongo client instance, or null on error.
 *
 * @example
 * // Basic Usage
 * import { MongoClient } from '@linnovate/blocktree';
 * const mongo = await MongoClient({ MONGO_URI: 'mongodb://root:root@localhost:27017' });
 * console.log("MongoClient:", await mongo?.db('admin').command({ ping: 1 }) );
 *
 * @example
 * // Mocking Usage
 * import { MongoClient } from '@linnovate/blocktree';
 * const mongo = await MongoClient({ mock: true });
 * console.log("MongoClient Mocking:", await mongo?.db('admin').command({ ping: 1 }) );
 *
 * @example
# docker-compose.yaml for Mongo
services:
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
const $instances = {};

export async function MongoClient({
  MONGO_URI = process.env.MONGO_URI,
  mock = false,
  logPrefix = '',
  ...options
} = {}) {

  // Create a unique key for the singleton based on MONGO_URI or mock
  const instanceKey = mock ? 'mock' : MONGO_URI;
  
  /**
   * Return Singleton if exists
   */
  if ($instances[instanceKey]) {
    return $instances[instanceKey];
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { MongoClient } = await DynamicImport('mongodb@^7');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Validation
   */
  if (!MONGO_URI && !mock) {
    logger.error(`${logPrefix}MongoClient [missing env]: MONGO_URI || mock`);
    return;
  }
  logger.debug(`${logPrefix}MongoClient [setup] options (path: ${MONGO_URI})`, { namespace: 'MongoClient', MONGO_URI, mock, logPrefix, ...options });

  /*
   * Mock Setup
   */
  if (mock) {
    const { MongoMemoryServer } = await DynamicImport('mongodb-memory-server@^10');
    const mongoServer = await MongoMemoryServer.create();
    MONGO_URI = mongoServer.getUri();
  }

  /*
   * Logger Transport
   */
  const mongodbLog = {
    mongodbLogComponentSeverities: { command: 'debug' },
    mongodbLogPath: {
      async write({ c, commandName, message, serverHost, serverPort, databaseName, durationMS }) {
        if (c == 'command') {
          const events = { 'Command started': 'request', 'Command succeeded': 'response' };
          const msg = `${serverHost}:${serverPort} - ${databaseName} {${commandName}} ${durationMS || 0}ms`;
          logger.debug(`${logPrefix}MongoClient [${events[message] || message}] ${msg}`, { namespace: 'MongoClient', serverHost, serverPort, databaseName, message, commandName, durationMS, command: '...', reply: '...' });
        }
      }
    }
  }

  /*
   * Logger Transport (via Events)
   */
  // client.on('commandStarted', (event) => {
  //   if (event.commandName === 'ping' || event.commandName === 'hello') return; // Reduce noise
  //   logger.debug(`${logPrefix}MongoClient [request] ${event.databaseName} {${event.commandName}}`, {
  //       namespace: 'MongoClient',
  //       type: 'request',
  //       database: event.databaseName,
  //       command: event.commandName,
  //       requestId: event.requestId,
  //       payload: event.command
  //   });
  // });

  // client.on('commandSucceeded', (event) => {
  //   if (event.commandName === 'ping' || event.commandName === 'hello') return; 
  //   logger.debug(`${logPrefix}MongoClient [response] ${event.databaseName} {${event.commandName}} ${event.duration}ms`, {
  //       namespace: 'MongoClient',
  //       type: 'response',
  //       database: event.databaseName,
  //       command: event.commandName,
  //       requestId: event.requestId,
  //       duration: event.duration,
  //       reply: event.reply
  //   });
  // });

  // client.on('commandFailed', (event) => {
  //   logger.error(`${logPrefix}MongoClient [error] ${event.databaseName} {${event.commandName}} ${event.duration}ms - ${event.failure}`, {
  //       namespace: 'MongoClient',
  //       type: 'error',
  //       database: event.databaseName,
  //       command: event.commandName,
  //       requestId: event.requestId,
  //       duration: event.duration,
  //       error: event.failure
  //   });
  // });
  
  /*
   * Create instance
   */
  const instance = new MongoClient(MONGO_URI, {
    ...options,
    ...mongodbLog,
  });

  instance.on('error', (error) => {
    logger.error(`${logPrefix}MongoClient [error] ${error?.message}!`);
  });

  $instances[instanceKey] = await instance.connect()
    .then(() => {
      logger.info(`${logPrefix}MongoClient [setup] initialized! (mock: ${!!mock})`);
      return instance;
    })
    .catch(error => {
      logger.error(`${logPrefix}MongoClient [setup] ${error?.message}!`);
      return null;
    });
    
  return $instances[instanceKey];
  
}
