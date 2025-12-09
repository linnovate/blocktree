/**
 * Optimize Express - Sets up compression and other optimization middleware.
 * - To enable debug logs set env: `DEBUG=blocktree:OptimizeExpress` or `DEBUG=blocktree`
 *
 * @async
 * @function OptimizeExpress
 * @requires module:compression@^1
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} app - The express application instance.
 * @param {Object|null} options - Configuration options.
 * @param {Object|null} options.compressionOptions - Options to pass to the `module:compression`. {@link https://www.npmjs.com/package/compression}
 *
 * @returns {Promise<void>}
 *
 * @example
 * await OptimizeExpress(app);
 */
export async function OptimizeExpress(app, { compressionOptions } = {}) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { default: compression } = await DynamicImport('compression@^1');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`OptimizeExpress [setup] options`, { namespace: 'OptimizeExpress' });

  /*
   * Use Middleware
   */
  app.use(compression(compressionOptions));

  logger.info(`OptimizeExpress [setup] initialized!`);

}
