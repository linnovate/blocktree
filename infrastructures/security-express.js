import { Logger } from '../utils/logger.js';

/**
 * Security Express
 * @function SecurityExpress
 * @modules compression helmet cors
 * @envs []
 * @param {object} the express app
 * @param {object} {
 *   corsOptions,   // see: https://www.npmjs.com/package/cors#configuring-cors 
 *   helmetOptions, // see: https://www.npmjs.com/package/helmet
 * }
 * @return {object} express app.next()
 * @example SecurityExpress(app, { corsOptions, helmetOptions } = {});
 */

export function SecurityExpress(app, { corsOptions, helmetOptions } = {}) {

  (async function () {

    const logger = await Logger();

    const { default: compression } = await import('compression').catch(err => {
      throw logger.error('GraphqlExpress [missing module]: compression');
      ;
    });
    const { default: helmet } = await import('helmet').catch(err => {
      throw logger.error('GraphqlExpress [missing module]: helmet');
    });
    const { default: cors } = await import('cors').catch(err => {
      throw logger.error('GraphqlExpress [missing module]: cors');
    });

    app.use(compression());
    app.use(cors(corsOptions));
    app.use(helmet({
      crossOriginEmbedderPolicy: { policy: "credentialless" },
      contentSecurityPolicy: { reportOnly: true },
      ...helmetOptions,
    }));
  }())

  return (req, res, next) => next();

};