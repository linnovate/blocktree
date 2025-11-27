/**
 * Mongo Client singleton.
 * @function MongoClient
 * @modules [mongodb@^7 pino@^10]
 * @envs [MONGO_URI, LOG_SERVICE_NAME]
 * @param {object} {
 *   MONGO_URI, {string} the mongo service url (mongodb://[user]:[pass]@[host]:[port]/[db_name]?authSource=admin)
 *   mock, // {null|bool} using "mongodb-memory-server@^10"
 * } 
 * @param {object} MongoClientOptions
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mongodb
 * @example const data = await (await MongoClient()).db('...');
 * @example const client = await MongoClient(); const data = await client.db('...');
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

const $instances = {};

export async function MongoClient({
  MONGO_URI = process.env.MONGO_URI,
  mock,
  rejectOnError,
  logPrefix = "",
  ...options
} = {}) {

  /*
   * Get instance
   */
  if ($instances[MONGO_URI]) {
    return $instances[MONGO_URI];
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { MongoClient } = await DynamicImport('mongodb@^7');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Options
   */
  if (!MONGO_URI && !mock) {
    logger.error(`${logPrefix}MongoClient [missing env]: MONGO_URI || mock`);
    return;
  }
  logger.debug(`${logPrefix}MongoClient [setup] options (path: ${MONGO_URI})`, { MONGO_URI, mock, rejectOnError, logPrefix, ...options });

  /*
   * Mock
   */
  if (mock) {
    const { MongoMemoryServer } = await DynamicImport('mongodb-memory-server@^10');
    const mongoServer = await MongoMemoryServer.create();
    MONGO_URI = mongoServer.getUri();
  }

  /*
   * Logger
   */
  const mongodbLog = {
    mongodbLogComponentSeverities: { command: "debug" },
    mongodbLogPath: {
      async write({ c, commandName, message, serverHost, serverPort, databaseName, durationMS }) {
        if (c == 'command') {
          const events = { "Command started": "request", "Command succeeded": "response" };
          const msg = `${serverHost}:${serverPort} - ${databaseName} {${commandName}} ${durationMS || 0}ms`;
          logger.debug(`${logPrefix}MongoClient [${events[message] || message}] ${msg}`, { serverHost, serverPort, databaseName, message, commandName, durationMS, command: "...", reply: "..." });
        }
      }
    }
  }

  /*
   * Instance
   */
  $instances[MONGO_URI] = new MongoClient(MONGO_URI, {
    ...options,
    ...mongodbLog,
  });

  $instances[MONGO_URI].on('error', (error) => {
    logger.error(`${logPrefix}MongoClient [error] ${error?.message}!`);
  });

  await $instances[MONGO_URI].connect().then(() => {
    logger.info(`${logPrefix}MongoClient [setup] starting! (mock: ${!!mock})`);
  })

  return $instances[MONGO_URI];
};
