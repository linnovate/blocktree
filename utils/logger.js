/**
 * Logger.
 * @function Logger
 * @modules [pino@^8 pino-pretty@^10]
 * @envs [LOG_SERVICE_NAME, LOG_LEVEL]
 * @param {object} {
     LOG_SERVICE_NAME,
     LOG_LEVEL: 'info', // enum: fatal|error|warn|info|debug|trace|silent
     setupOptions: { server: serverInstance, ... },
     details: { codeLine: true, ip: true },
   }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/pino
 * @example 
   ---------------------------
   import { Logger, logger } from '@linnovate/blocktree';
   await Logger({ setupOptions: {}, details: {} });
   logger.info('...', '...');
 */

let $instance;
export { $instance as logger };

let $socket;

export async function Logger({ LOG_SERVICE_NAME, LOG_LEVEL, setupOptions, details } = {}) {

  if ($instance?.info) {
    return $instance;
  }

  /**
   * imports
   */
  const { default: pino } = await import('pino').catch(error => {
    console.error('Logger \x1b[31m[missing module] \x1b[36m pino \x1b[0m');
  });

  const pinoPretty = await import('pino-pretty').catch(error => {
    console.error('Logger \x1b[31m[missing module] \x1b[36m pino-pretty \x1b[0m');
  });
  
  // envs
  LOG_SERVICE_NAME ??= process.env.LOG_SERVICE_NAME;
  LOG_LEVEL ??= process.env.LOG_LEVEL;
  
  if (!LOG_SERVICE_NAME) {
    console.warn('Logger \x1b[31m[missing env] \x1b[36m LOG_SERVICE_NAME \x1b[0m');
  }

  /**
   * instance
   */ 
  $instance = pino({
    name: LOG_SERVICE_NAME,
    level: LOG_LEVEL || 'info',
    transport: {
      target: pinoPretty ? 'pino-pretty' : 'pino/file',
      options: {
        colorize: true
      }
    },
    hooks: {
      logMethod(inputArgs, method, level) {
        const msg = inputArgs.shift();
        const obj = {};
        details?.codeLine && (obj.code = GetCodeLine(level));
        details?.ip && (obj.ip = $socket?.address?.()?.address);
        Object.assign(obj, inputArgs.shift() || {}) 
        return method.apply(this, [obj, msg])
      }
    }, 
    ...setupOptions,
  });
  
  /**
   * Logs for services
   */ 
  if (setupOptions?.server) {
    ServerLogger(setupOptions.server, $instance);
  }

  return $instance;

};


/**
 * Get Code Line
 */ 
function GetCodeLine(level) {

  // level = fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10,
  
  const codeLine = Error().stack?.split("\n")[4];
  const functionName = codeLine.match(/at (.*) /)?.[1] || '[anonymous]';
  
  return {
    file: codeLine.match(/(file:.*):(\d+:\d+)/)?.[1],
    function: codeLine.match(/at (.*) /)?.[1] || '[anonymous]',
    line: codeLine.match(/(\d+:\d+)/)?.[1],
    trace: (level < 50) ? undefined : Error().stack?.split('\n')?.slice(4)?.map(i => i.trim()),
  };
  
}


/**
 * Server Logger
 */ 
function ServerLogger(server, $instance) {

  server.on('connection', (socket) => {
    $socket = socket;
  })
  
  server.on('request', (req, res) => {
    $instance.info('Server [connect]', {
      code: undefined,
      method: req.method,
      url: `${req.originalUrl}`,
      statusCode: res.statusCode,
    });
  })
  
}
