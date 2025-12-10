/**
 * Mailer Client - Singleton Mysql2 instance.
 * - Uses default envs: `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASS`, `MYSQL_DB`.
 * - To enable debug logs set env: `DEBUG=blocktree:MySqlClient` or `DEBUG=blocktree`
 * 
 * @async
 * @function MySqlClient
 * @requires module:mysql2@^3
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.MYSQL_HOST=process.env.MYSQL_HOST - Database host.
 * @param {string} options.MYSQL_USER=process.env.MYSQL_USER - Database user.
 * @param {string} options.MYSQL_PASS=process.env.MYSQL_PASS - Database password.
 * @param {string} options.MYSQL_DB=process.env.MYSQL_DB - Database name.
 * @param {boolean} options.usePool=false - If true, creates a connection pool instead of a single connection.
 * @param {string} options.logPrefix - Prefix for log messages.
 * @param {Object|null} ...options - Additional standard `module:mysql2` options. {@link https://www.npmjs.com/package/mysql2}
 *
 * @returns {Promise<Object>} The initialized MySQL connection or pool instance.
 *
 * @example
 * import { MySqlClient } from '@linnovate/blocktree';
 * const mysql = await MySqlClient({ usePool: true, MYSQL_HOST: 'localhost', MYSQL_USER: 'root', MYSQL_PASS: 'root', MYSQL_DB: 'test' });
 * console.log('MySqlClient:', await mysql.query('SELECT * FROM users WHERE id = ?', [1]).catch(error => error) );
 *
 * @example
# docker-compose.yaml for Mysql
services:
  mysql:
    image: mysql:9
    volumes:
      - ./.mysql:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'
    ports:
      - 3306:3306
  */
const $instances = {};

export async function MySqlClient({
  MYSQL_HOST = process.env.MYSQL_HOST,
  MYSQL_USER = process.env.MYSQL_USER,
  MYSQL_PASS = process.env.MYSQL_PASS,
  MYSQL_DB = process.env.MYSQL_DB,
  usePool = false,
  logPrefix = '',
  ...options
} = {}) {

  // Create a unique key for the singleton based on Host + DB name
  const instanceKey = `${MYSQL_HOST}:${MYSQL_DB}`;
  
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
  const { createConnection, createPool } = await DynamicImport('mysql2/promise@^3');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Validation
   */
  if (!MYSQL_HOST || !MYSQL_DB) {
    logger.error(`${logPrefix}MySqlClient [missing env]: MYSQL_HOST, MYSQL_DB`);
    return;
  }
  logger.debug(`${logPrefix}MySqlClient [setup] options (path: ${MYSQL_HOST})`, { namespace: 'MySqlClient', MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB, usePool, ...options });

  /*
   * Create DATABASE IF NOT EXISTS
   * We connect without selecting a DB first to perform this check.
   */
  const client = await createConnection({ host: MYSQL_HOST, user: MYSQL_USER, password: MYSQL_PASS, ...options }).catch(() => null); 
  await client?.query(`CREATE DATABASE\`${MYSQL_DB}\`;`)
    .then(() => logger.info(`${logPrefix}MySqlClient [setup] create database - ${MYSQL_DB}`))
    .catch(() => null); 
  client?.end()
 
  /*
   * Create instance
   */
  if (usePool) {
    $instances[instanceKey] = createPool({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASS,
      database: MYSQL_DB,
      ...options,
    });
    logger.info(`${logPrefix}MySqlClient [setup] initialized! (usePool: ${!!usePool})`);
  }
  else {
    $instances[instanceKey] = await createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASS,
      database: MYSQL_DB,
      ...options,
    })
      .then(async client => {
        logger.info(`${logPrefix}MySqlClient [setup] initialized! (usePool: ${!!usePool})`);
        return client;
      })
      .catch(error => {
        logger.error(`${logPrefix}MySqlClient [setup] ${error?.message}!`);
      });
  }
   
  return $instances[instanceKey];

}
