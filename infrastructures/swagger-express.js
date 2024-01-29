import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Swagger Express
 * @function SwaggerExpress
 * @modules [swagger-ui-express@^5]
 * @envs []
 * @route /api-docs
 * @param {object} the express app
 * @param {object} options {
 *   ...[swagger-ui options],    // see: https://www.npmjs.com/package/swagger-ui-express 
 *   ...[swagger-jsdoc options], // see: https://www.npmjs.com/package/swagger-jsdoc
 * }
 * @return {promise} is done
 * @example SwaggerExpress(app, options);
 * @example JsDoc comment:
    ---------------
    / *
    * @openapi
    * /login:
    *   get:
    *     description: Welcome to swagger-jsdoc!
    *     responses:
    *       200:
    *         description: Returns a mysterious string.
    * /
    app.use('/login', (req, res) => {});
 */

export async function SwaggerExpress(app, options) {

  /*
   * Imports
   */
  const { default: SwaggerUI } = await DynamicImport('swagger-ui-express@^5');
  const { default: swaggerJsdoc } = await DynamicImport('swagger-jsdoc@^6');

  /*
   * JsDoc options
   */
  const jsDocsOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Swagger UI',
        version: '1.0.0',
      },
    },
    apis: ['./*.js'],
    ...options,
  }

  /*
   * SwaggerUI
   */
  app.use(
    '/api-docs',
    SwaggerUI.serve,
    SwaggerUI.setup(swaggerJsdoc(jsDocsOptions), options)
  );

};
