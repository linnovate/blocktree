/**
 * Logger.
 * @function Logger
 * @modules [pino@^8]
 * @envs [LOG_SERVICE_NAME]
 * @param {object} { LOG_SERVICE_NAME }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/winston
 * @example (await Logger()).log('...', '...');
 * @example Logger().then(logger => { logger.log('...', '...'); });
 * @example const logger = await Logger(); logger.log('...', '...');
 */

let $instance;

export async function Logger({ LOG_SERVICE_NAME } = {}) {

  if ($instance) {
    return $instance;
  }

  // imports
  const pino = await import('pino').catch(error => {
    console.error('Logger [missing module]: pino');
  });

  // envs
  LOG_SERVICE_NAME ??= process.env.LOG_SERVICE_NAME;

  if (!LOG_SERVICE_NAME) {
    console.warn('Logger [missing env]: LOG_SERVICE_NAME');
  }

  // instance
  $instance = pino().child({ service: LOG_SERVICE_NAME });

  return $instance;

};
