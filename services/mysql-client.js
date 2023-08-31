import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * MySql Client singleton.
 * @function MySqlClient
 * @modules [mysql2@^3 pino@^8 pino-pretty@^10]
 * @envs [MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB, LOG_SERVICE_NAME]
 * @param {object} { MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/mysql2
 * @example const data = await (await MySqlClient()).query('...', () => {});
 * @dockerCompose
  # Mysql service
  mysql:
    image: mysql:8
    volumes:
      - ./.mysql:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'
    ports:
      - 3306:3306
 */

let $instance;

export async function MySqlClient({ MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB } = {}) {

  const logger = await Logger();
  
  if ($instance) {
    return $instance;
  }

  // imports
  const Mysql = await DynamicImport('mysql2@^3');
  
  // envs
  MYSQL_HOST ??= process.env.MYSQL_HOST;
  MYSQL_USER ??= process.env.MYSQL_USER;
  MYSQL_PASS ??= process.env.MYSQL_PASS;
  MYSQL_DB ??= process.env.MYSQL_DB;

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASS || !MYSQL_DB) {
    logger.error('MySqlClient [missing env]: MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB');
  }

  // instance
  $instance = Mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASS,
    database: MYSQL_DB
  });

  return $instance;

};
