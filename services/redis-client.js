import { Logger } from '../utils/logger.js';

/**
 * Redis Client singleton.
 * @function RedisClient
 * @modules [redis@^4 pino@^8]
 * @envs [REDIS_URI, LOG_SERVICE_NAME]
 * @param {object} { REDIS_URI }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/redis
 * @example const data = await (await RedisClient()).set('key', 'value');
 */

let $instance;

export async function RedisClient({ REDIS_URI } = {}) {

  const logger = await Logger();
  
  if ($instance) {
    return $instance;
  }

  // imports
  const { createClient } = await import('redis').catch(error => {
    logger.error('RedisClient [missing module]: redis');
  });

  // envs
  REDIS_URI ??= process.env.REDIS_URI;

  if (!REDIS_URI) {
    logger.error('RabitmqClient [missing env]: REDIS_URI');
  }

  // instance
  $instance = createClient({ url: REDIS_URI });

  await $instance.connect();

  return $instance;

};
