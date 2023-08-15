import { Logger } from '../utils/logger.js';

/**
 * Redis Client singleton.
 * @function RedisClient
 * @modules redis@^4
 * @envs REDIS_URI
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
  const { createClient } = await import('redis').catch(err => {
    throw logger.error('RedisClient [missing module]: redis');
  });

  // envs
  REDIS_URI ??= process.env.REDIS_URI;

  if (!REDIS_URI) {
    throw logger.error('RabitmqClient [missing env]: REDIS_URI');
  }

  // instance
  $instance = createClient({ url: REDIS_URI });

  await $instance.connect();

  return $instance;

};