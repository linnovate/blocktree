/**
 * Logger.
 * @function Logger
 * @modules [pino@^10 pino-pretty@^13]
 * @envs [LOG_SERVICE_NAME, LOG_LEVEL]
 * @param {object} {
 *   LOG_SERVICE_NAME,
 *   LOG_LEVEL: 'info', // enum: fatal|error|warn|info|debug|trace|silent
 *   server,
 *   ...,               // other pino options.
 * }
 * @return {Promise<object>} The singleton instance of the pino logger.
 * @docs https://www.npmjs.com/package/pino
 * @example 
 * ---------------------------
 * import { Logger, logger } from '@linnovate/blocktree';
 * await Logger({});
 * logger.info('User logged in', { userId: 123 });
 *
 */

let $instance;
let $socket;

export { $instance as logger };

export async function Logger({
  LOG_SERVICE_NAME = process.env.LOG_SERVICE_NAME,
  LOG_LEVEL = process.env.LOG_LEVEL || 'info',
  server,
  ...options
} = {}) {

  if ($instance?.info) {
    return $instance;
  }

  /**
   * Imports
   */
  const { DynamicImport } = await import('./dynamic-import.js');
  const { default: pino } = await DynamicImport('pino@^10');
  const { default: pinoPretty } = await DynamicImport('pino-pretty@^13');

  /**
   * Options
   */
  if (!LOG_SERVICE_NAME) {
    console.warn('Logger \x1b[31m[missing env] \x1b[36m LOG_SERVICE_NAME \x1b[0m');
  }
  console.debug(`Logger [setup] options`, { LOG_SERVICE_NAME, LOG_LEVEL, server: server?.toString?.(), ...options });

  /*
   * Server connection listener to capture the socket for IP logging
   */
  server?.on('connection', (socket) => $socket = socket)

  /*
   * Create logger
   */
  function loggerHook(inputArgs, method, level) {
    const [msg, args] = inputArgs;
    // the stack line 3 typically points to the original call site outside the hook logic
    const stack = Error().stack?.split("\n")[3];
    const isErrorLog = (level >= 50); // fatal: 60 || error: 50
    // convert undefineds to nulls for print the var in log
    const argsValues = structuredClone(args);
    Object.keys(argsValues || {}).forEach(key => argsValues[key] ??= null);
    // set msg data
    return method.apply(this, [{
      ...argsValues,
      msg,
      ip: $socket?.address?.()?.address,
      codeLine: (LOG_LEVEL == "debug") ? {
        // extract file path
        file: stack?.match(/(file:.*):(\d+:\d+)/)?.[1],
        // extract function name
        function: stack?.match(/at (.*) /)?.[1] || '[anonymous]',
        // extract line and column number
        line: stack?.match(/(\d+:\d+)/)?.[1],
        // include full trace for error logs in debug mode
        trace: isErrorLog ? Error().stack?.split('\n')?.slice(4)?.map(i => i.trim()) : undefined,
      } : undefined
    }])
  }

  /**
   * Create instance
   */
  $instance = pino({
    name: LOG_SERVICE_NAME,
    level: LOG_LEVEL,
    transport: {
      target: pinoPretty ? 'pino-pretty' : 'pino/file',
      options: {
        colorize: true,
        translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
        singleLine: true,
      }
    },
    ...options,
    hooks: {
      logMethod: loggerHook,
      ...(options?.hooks || {}),
    },
  });


  /**
   * Logs for services
   */
  if (LOG_LEVEL == 'debug') {
    // add a listener for incoming server requests in debug mode
    server?.on('request', (req, res) => {
      $instance.debug('Server [connect]', {
        method: req.method,
        // use req.originalUrl if available, otherwise req.url
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
      });
    })
  }

  console.info(`Logger [setup] is starting! (LOG_LEVEL: ${LOG_LEVEL})`);

  return $instance;

};
