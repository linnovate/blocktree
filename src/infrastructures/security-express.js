/**
 * Security Express
 * @function SecurityExpress
 * @modules [helmet@^8 cors@^2 express-rate-limit@^8]
 * @envs []
 * @param {object} the express app
 * @param {object} {
 *   corsOptions,   // see: https://www.npmjs.com/package/cors#configuring-cors 
 *   helmetOptions, // see: https://www.npmjs.com/package/helmet
 * }
 * @return {promise} is done
 * @example SecurityExpress(app, { corsOptions, helmetOptions } = {});
 */
export async function SecurityExpress(app, { corsOptions, helmetOptions, rateOptions } = {}) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { default: helmet } = await DynamicImport('helmet@^8');
  const { default: cors } = await DynamicImport('cors@^2');
  const { rateLimit } = await DynamicImport('express-rate-limit@^8');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`SecurityExpress [setup] options`, { corsOptions, helmetOptions, rateOptions });

  /*
   * Use
   */
  app.use(cors(corsOptions));
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      reportOnly: true,
    },
    ...helmetOptions,
  }));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    message: "Too many requests from this IP, please try again after 15 minutes",
    ...rateOptions,
  }))

  const reportOnly = helmetOptions?.contentSecurityPolicy?.reportOnly || true;
  logger.info(`SecurityExpress [setup] starting! (cors: true, reportOnly: ${reportOnly}, rateLimit: true)`);

}
