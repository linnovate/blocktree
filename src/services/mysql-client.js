/**
 * MySql Client singleton.
 * @function MySqlClient
 * @modules [mysql2@^3 pino@^10]
 * @envs [MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB, LOG_SERVICE_NAME]
 * @param {object} { MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mysql2
 * @example const data = await (await MySqlClient()).query('...', () => {});
 * @dockerCompose
  # Mysql service
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
  logPrefix = "",
  MYSQL_HOST = process.env.MYSQL_HOST,
  MYSQL_USER = process.env.MYSQL_USER,
  MYSQL_PASS = process.env.MYSQL_PASS,
  MYSQL_DB = process.env.MYSQL_DB,
} = {}) {

  /*
   * Get instance
   */
  if ($instances[MYSQL_HOST]) {
    return $instances[MYSQL_HOST];
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const Mysql = await DynamicImport('mysql2@^3');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Options
   */
  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASS || !MYSQL_DB) {
    logger.error(`${logPrefix}MySqlClient [missing env]: MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB`);
    return;
  }
  logger.debug(`${logPrefix}MySqlClient [setup] options (path: ${MYSQL_HOST})`, { MYSQL_HOST, MYSQL_DB });

  /*
   * Instance
   */
  $instances[MYSQL_HOST] = Mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASS,
    database: MYSQL_DB
  });

  return $instances[MYSQL_HOST];

};
