import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Security Express
 * @function SecurityExpress
 * @modules [compression@^1 helmet@^7 cors@^2]
 * @envs []
 * @param {object} the express app
 * @param {object} {
 *   corsOptions,   // see: https://www.npmjs.com/package/cors#configuring-cors 
 *   helmetOptions, // see: https://www.npmjs.com/package/helmet
 * }
 * @return {promise} in done
 * @example SecurityExpress(app, { corsOptions, helmetOptions } = {});
 */

export async function SecurityExpress(app, { corsOptions, helmetOptions } = {}) {

  const { default: compression } = await DynamicImport('compression@^1');
  const { default: helmet } = await DynamicImport('helmet@^7');
  const { default: cors } = await DynamicImport('cors@^2');

  app.use(compression());
  app.use(cors(corsOptions));
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      reportOnly: true,
    },
    ...helmetOptions,
  }));

};