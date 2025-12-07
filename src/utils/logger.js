/**
 * Logger - Singleton logger instance.
 * - Uses default envs: `LOG_SERVICE_NAME`, `DEBUG`.
 * - Includes comprehensive logging for request `Server` cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:Server` or `DEBUG=blocktree` or `DEBUG=blocktree:*` to ignore `DEBUG=-blocktree:Server`
 * 
 * @async
 * @function Logger
 * @requires module:pino@^10
 * @requires module:pino-pretty@^13
 *
 * @param {Object|null} options - Configuration options.
 * @param {string|null} options.DEBUG=process.env.DEBUG - Debug namespaces string (e.g., "blocktree:*, -blocktree:Server"). {@link https://www.npmjs.com/package/debug}
 * @param {string|null} options.LOG_SERVICE_NAME=process.env.LOG_SERVICE_NAME - The name of the service to appear in logs.
 * @param {Object|null} options.server - An http server instance to attach request logging to.
 * @param {Object|null} ...options - Additional standard pino options. {@link https://www.npmjs.com/package/pino}
 *
 * @returns {Promise<Object>} The initialized Pino instance.
 *
 * @example
 * const logger = await Logger();
 * logger.info('User logged in', { userId: 123 });
 */

let $instance;

export let logger; // Export the binding. It will be undefined until Logger() resolves.

export async function Logger({
  DEBUG = process.env.DEBUG,
  LOG_SERVICE_NAME = process.env.LOG_SERVICE_NAME,
  server,
  ...options
} = {}) {

  /**
   * Return Singleton if exists
   */
  if ($instance) {
    return $instance;
  }

  /**
   * Imports
   */
  const { DynamicImport } = await import('./dynamic-import.js');
  const { default: pino } = await DynamicImport('pino@^10');
  const { default: pinoPretty } = await DynamicImport('pino-pretty@^13');

  /**
   * Validation
   */
  if (!LOG_SERVICE_NAME) {
    console.warn('Logger \x1b[31m[missing env] \x1b[36m LOG_SERVICE_NAME \x1b[0m');
  }
  console.debug(`Logger [setup] options`, { LOG_SERVICE_NAME, DEBUG, server: server ? '[Server Instance]' : undefined, ...options });

  /**
   * Helper: Check if namespace is enabled in DEBUG env
   * @ignore
   */
  function debugByNamespace(DEBUG, namespace) {
    const debugs = DEBUG?.split(',')?.map(i => i.trim());
    const isFullDebug = debugs?.includes('blocktree') || debugs?.includes('blocktree:*');
    const ignoreService = debugs?.includes(`-blocktree:${namespace}`);
    const specificService = debugs?.includes(`blocktree:${namespace}`);
    if (isFullDebug && !ignoreService || specificService) {
      return true;
    }
    return false;
  }
  
  /**
   * Helper: Format arguments and extract stack trace
   * @ignore
   */
  function logFormater(inputArgs, level) {
    const [msg, args] = inputArgs;
    const argsValues = structuredClone(args || {});
    Object.keys(argsValues || {}).forEach(key => argsValues[key] ??= null); // convert undefineds to nulls for print the var in log
    const stack = Error().stack?.split('\n')[4]; // the stack line 4 typically points to the original call site outside the hook logic
    const codeLine = (level == 20) ? { // is debug level
      file: stack?.match(/(file:.*):(\d+:\d+)/)?.[1], // extract file path
      function: stack?.match(/at (.*) /)?.[1] || '[anonymous]', // extract function name
      line: stack?.match(/(\d+:\d+)/)?.[1], // extract line and column number
      trace: level >= 50 ? Error().stack?.split('\n')?.slice(4)?.map(i => i.trim()) : undefined, // include full trace for error logs in debug mode
    } : undefined
    return [{ ...argsValues, msg, codeLine }];
  }
  
  /**
   * Create Pino Instance
   * @ignore
   */
  $instance = pino({
    name: LOG_SERVICE_NAME,
    level: 'debug',
    transport: {
      target: pinoPretty ? 'pino-pretty' : 'pino/file',
      options: {
        colorize: true,
        translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
        singleLine: true,
        ignore: 'pid,hostname', // cleaner output
        // destination: 1, // Stdout
      },
    },
    ...options,
    hooks: {
      logMethod: function (inputArgs, method, level) {
        if (level == 20 && !debugByNamespace(DEBUG, inputArgs?.[1]?.namespace)) {
          return;
        }
        return method.apply(this, logFormater(inputArgs, level));
      },
      ...(options?.hooks || {}),
    },
  });

  // Assign to exported variable
  logger = $instance;
  
  /**
   * Attach Server Logger
   */
  if (server && debugByNamespace(DEBUG, 'Server')) {
    server.on('request', (req) => {
      $instance.debug(`Server [request] [${req.method}]${req.originalUrl || req.url}`, {
        namespace: 'Server',
        ip: req.socket.remoteAddress || req.ip,
        method: req.method,
        url: req.originalUrl || req.url,
      });
    });
  }

  console.info(`Logger [setup] initialized! (service: ${LOG_SERVICE_NAME})`);

  return $instance;

}
