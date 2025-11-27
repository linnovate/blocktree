/**
 * Optimize Express
 * @function OptimizeExpress
 * @modules [compression@^1]
 * @envs []
 * @param {object} the express app
 * @param {object} {
 *   corsOptions,   // see: https://www.npmjs.com/package/cors#configuring-cors 
 *   helmetOptions, // see: https://www.npmjs.com/package/helmet
 * }
 * @return {promise} is done
 * @example OptimizeExpress(app, { corsOptions, helmetOptions } = {});
 */
export async function OptimizeExpress(app) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { default: compression } = await DynamicImport('compression@^1');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`OptimizeExpress [setup] options`);

  /*
   * Use
   */
  app.use(compression());

  logger.info(`OptimizeExpress [setup] starting!`);

}
