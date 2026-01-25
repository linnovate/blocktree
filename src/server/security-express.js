/**
 * Security Express - Configures essential security middleware for the application.
 * - To enable debug logs set env: `DEBUG=blocktree:SecurityExpress` or `DEBUG=blocktree`
 * 
 * @async
 * @function SecurityExpress
 * @requires module:helmet@^8
 * @requires module:cors@^2
 * @requires module:express-rate-limit@^8
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} app - The express application instance.
 * @param {Object|null} options - Configuration options.
 * @param {String|null} options.corsOptions - Options to pass to the `module:cors`. {@link https://www.npmjs.com/package/cors#configuring-cors}
 * @param {String|null} options.helmetOptions - Options to pass to the `module:helmet`. {@link https://www.npmjs.com/package/helmet}
 * @param {String|null} options.rateLimitOptions={ windowMs: 60000, limit: 200 } - Options to pass to the `module:express-rate-limit`. {@link https://www.npmjs.com/package/express-rate-limit}
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { SecurityExpress } from '@linnovate/blocktree';
 * await SecurityExpress(app);
 */
export async function SecurityExpress(app, { corsOptions, helmetOptions, rateLimitOptions } = { rateLimitOptions: { windowMs: 60000, limit: 200 } }) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { default: cors } = await DynamicImport('cors@^2');
  const { default: helmet } = await DynamicImport('helmet@^8');
  const { rateLimit } = await DynamicImport('express-rate-limit@^8');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`SecurityExpress [setup] options`, { namespace: 'SecurityExpress', corsOptions, helmetOptions, rateLimitOptions });

  /*
   * Use Middleware
   */
  // CORS
  app.use(cors(corsOptions));

  // Helmet (Headers)
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      reportOnly: true,
    },
    ...helmetOptions,
  }));

  // Rate Limiter
  app.use(rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    limit: 200, // Limit each IP to 200 requests per `window` (here, per 1 minutes).
    message: 'Too many requests from this IP, please try again after 1 minutes',
    ...rateLimitOptions,
  }))

  app.set('trust proxy', 1);

  const reportOnly = helmetOptions?.contentSecurityPolicy?.reportOnly || true;
  logger.info(`SecurityExpress [setup] initialized! (cors: true, reportOnly: ${reportOnly}, rateLimit: true)`);

}
