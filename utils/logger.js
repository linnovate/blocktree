/**
 * Logger.
 * @function Logger
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME]
 * @param {object} { LOG_SERVICE_NAME }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/pino
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
  const { default: pino } = await import('pino').catch(error => {
    console.error('Logger \x1b[31m[missing module] \x1b[36m pino \x1b[0m');
  });

  // imports
  const pinoPretty = await import('pino-pretty').catch(error => {
    console.error('Logger \x1b[31m[missing module] \x1b[36m pino-pretty \x1b[0m');
  });
  
  // envs
  LOG_SERVICE_NAME ??= process.env.LOG_SERVICE_NAME;

  if (!LOG_SERVICE_NAME) {
    console.warn('Logger \x1b[31m[missing env] \x1b[36m LOG_SERVICE_NAME \x1b[0m');
  }

  // instance
  $instance = pino({
    name: LOG_SERVICE_NAME,
    transport: {
      target: pinoPretty ? 'pino-pretty' : 'pino/file',
      options: {
        colorize: true
      }
    },
    hooks: {
      logMethod(inputArgs, method, level) {
        if (inputArgs.length >= 2) {
          const arg1 = inputArgs.shift()
          const arg2 = inputArgs.shift()
          return method.apply(this, [arg2, arg1, ...inputArgs])
        }
        return method.apply(this, inputArgs)
      }
    }
  });

  return $instance;

};
