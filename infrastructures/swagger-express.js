import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Swagger Express
 * @function SwaggerExpress
 * @modules [swagger-ui-express@^5 swagger-jsdoc@^6]
 * @envs [SWAGGER_URL]
 * @route /api-docs
 * @param {object} the express app
 * @param {object} options {
 *   SWAGGER_URL,                // the api docs route
 *   autoExpressPaths,           // create swagger paths by express routes (default: true)
 *   ...[swagger-ui options],    // see: https://www.npmjs.com/package/swagger-ui-express 
 *   ...[swagger-jsdoc options], // see: https://www.npmjs.com/package/swagger-jsdoc
 * }
 * @return {promise} is done
 * @example SwaggerExpress(app, options);
 * @example JsDoc annotated:
    ---------------
    / **
    * @openapi
    * /login:
    *   get:
    *     description: Welcome to swagger-jsdoc!
    *     responses:
    *       200:
    *         description: Returns a mysterious string.
    * /
    app.get('/login', (req, res) => res.send("OK"));
 */

export async function SwaggerExpress(app, options = { autoExpressPaths: true }) {

  /*
   * Imports
   */
  const { default: SwaggerUI } = await DynamicImport('swagger-ui-express@^5');
  const { default: swaggerJsdoc } = await DynamicImport('swagger-jsdoc@^6');

  // envs
  options.SWAGGER_URL ??= process.env.SWAGGER_URL || '/api-docs';

  /*
   * JsDoc options
   */
  let jsDocsOptions = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Swagger UI',
        version: '1.0.0',
      },
    },
    apis: ['./*.js'],
    ...options,
  })

  /*
   * Auto express paths
   */
  if (options.autoExpressPaths) {
    const expressPaths = AutoExpressPaths(app);
    jsDocsOptions.paths = mergeDeep(jsDocsOptions.paths, expressPaths);
  }

  /*
   * SwaggerUI
   */
  app.use(
    options.SWAGGER_URL,
    SwaggerUI.serve,
    SwaggerUI.setup(jsDocsOptions, options)
  );

};


/**
 * AutoExpressPaths
 */
export function AutoExpressPaths(app) {

  const expressPaths = {};

  app._router?.stack?.forEach(i => {

    if (i.route?.path) {

      expressPaths[i.route.path] || (expressPaths[i.route.path] = {});

      Object.keys(i.route.methods).forEach(method => {

        expressPaths[i.route.path][method] = {
          parameters: i.keys.map(key => ({
            in: "path",
            name: key.name,
            required: !key.optional,
          })),
          responses: { 200: null },
        }

      })

    }

  })

  return expressPaths;

};


/**
 * mergeDeep
 */
function mergeDeep(obj1, obj2) {
  for (var p in obj2)
    try {
      if (Array.isArray(obj2[p])) {
        obj1[p] = mergeDeep([...obj1[p]], [...obj2[p]]);
      } else if (obj2[p]?.constructor == Object) {
        obj1[p] = mergeDeep({ ...obj1[p] }, { ...obj2[p] });
      } else {
        obj1[p] = obj2[p];
      }
    } catch (e) {
      obj1[p] = obj2[p];
    }
  return obj1;
};
