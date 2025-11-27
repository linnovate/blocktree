/**
 * Swagger Express
 * @function SwaggerExpress
 * @modules [swagger-ui-express@^5 swagger-jsdoc@^6]
 * @envs [SWAGGER_PATH]
 * @param {object} the express app
 * @param {object} options {
 *   SWAGGER_PATH,               // the api docs route (default: /api-docs)
 *   autoExpressPaths,           // create swagger paths by express routes (default: true)
 *   ...[swagger-ui options],    // see: https://www.npmjs.com/package/swagger-ui-express 
 *   ...[swagger-jsdoc options], // see: https://www.npmjs.com/package/swagger-jsdoc
 * }
 * @return {promise} is done
 * @routes {
 *   [get] [SWAGGER_PATH]        // the swagger ui
 *   [get] [SWAGGER_PATH].json   // the swagger docs
 * }
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
    * 
    app.get('/login', (req, res) => res.send("OK"));
 */
export async function SwaggerExpress(app, {
  SWAGGER_PATH = process.env.SWAGGER_PATH || '/api-docs',
  autoExpressPaths = true,
  ...options
} = {}) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { default: SwaggerUI } = await DynamicImport('swagger-ui-express@^5');
  const { default: swaggerJsdoc } = await DynamicImport('swagger-jsdoc@^6');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`SwaggerExpress [setup] options`, { SWAGGER_PATH, autoExpressPaths, ...options });

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

  setTimeout(() => {
    /*
     * Auto express paths
     */
    if (autoExpressPaths) {
      const expressPaths = AutoExpressPaths(app);
      jsDocsOptions.paths = mergeDeep(jsDocsOptions.paths, expressPaths);
    }

    /*
     * Swagger ui
     */
    app.use(
      SWAGGER_PATH,
      SwaggerUI.serve,
      SwaggerUI.setup(jsDocsOptions, options)
    );

    /*
     * Swagger docs
     */
    app.get(SWAGGER_PATH + '.json', (req, res) => {
      res.json(jsDocsOptions);
    });

    logger.info(`SwaggerExpress [setup] starting! (path: ${SWAGGER_PATH})`);

  });
}


/**
 * AutoExpressPaths
 */
export function AutoExpressPaths(app) {

  const expressPaths = {};

  app.router?.stack?.forEach(i => {

    if (i.route?.path) {

      let path = i.route.path;

      // replace keys format 
      i.keys.forEach(key => {
        path = path.replace(`:${key.name}`, `{${key.name}}`);
      });

      expressPaths[path] || (expressPaths[path] = {});

      Object.keys(i.route.methods).forEach(method => {
        expressPaths[path][method] = {
          parameters: i.keys.map(key => ({
            in: "path",
            name: key.name,
            required: !key.optional,
          })),
          responses: { 200: {} },
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
    } catch {
      obj1[p] = obj2[p];
    }
  return obj1;
};
