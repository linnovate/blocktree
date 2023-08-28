import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Redis Client singleton.
 * @function RedisClient
 * @modules [redis@^4 pino@^8 pino-pretty@^10]
 * @envs [REDIS_URI, LOG_SERVICE_NAME]
 * @param {object} { REDIS_URI } redis[s]://[[username][:password]@][host][:port][/db-number]
 * @param {object} { options } the redis options: https://github.com/redis/node-redis/blob/HEAD/docs/client-configuration.md
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/redis
 * @example const data = await (await RedisClient()).set('key', 'value');
 */

let $instance;

export async function RedisClient({ REDIS_URI, options } = {}) {

  const logger = await Logger();

  if ($instance) {
    return $instance;
  }

  // imports
  const { createClient } = await DynamicImport('redis@^4');

  // envs
  REDIS_URI ??= process.env.REDIS_URI;

  if (!REDIS_URI) {
    logger.error('RedisClient [missing env]: REDIS_URI');
  }

  // instance
  $instance = createClient({
    socket: {
      reconnectStrategy: retries => 3000
    },
    ...options,
    url: REDIS_URI,
  });

  $instance.on('error', (error, con) => {
    logger.error('RedisClient [error]', { REDIS_URI, error, con });
  });

  await $instance.connect();

  return $instance;

};
