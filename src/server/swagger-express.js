/**
 * Swagger Express - Auto-generate and serve Swagger UI for Express applications.
 * - To enable debug logs set env: `DEBUG=blocktree:SwaggerExpress` or `DEBUG=blocktree`
 * 
 * @async
 * @function SwaggerExpress
 * @requires module:swagger-ui-express@^5
 * @requires module:swagger-jsdoc@^6
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} app - The express application instance.
 * @param {Object|null} options - Configuration options.
 * @param {String|null} options.SWAGGER_PATH=/api-docs - The URL route to serve the swagger UI.
 * @param {Object|null} options.swaggerUIOptions - Options to pass to `module:swagger-ui-express`. {@link https://www.npmjs.com/package/swagger-ui-express}
 * @param {Object|null} options.swaggerJsdocOptions - Options to pass to `module:swagger-jsdoc`. {@link https://www.npmjs.com/package/swagger-jsdoc}
 *
 * @returns {Promise<void>}
 *
 * @example
 * await SwaggerExpress(app);
 */
export async function SwaggerExpress(app, {
  SWAGGER_PATH = '/api-docs',
  swaggerUIOptions,
  swaggerJsdocOptions,
} = {}) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { default: SwaggerUI } = await DynamicImport('swagger-ui-express@^5');
  const { default: swaggerJsdoc } = await DynamicImport('swagger-jsdoc@^6');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`SwaggerExpress [setup] options`, { namespace: 'SwaggerExpress', SWAGGER_PATH, swaggerUIOptions, swaggerJsdocOptions });

  /*
   * Initialize JsDoc
   */
  const swaggerDocument = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Swagger UI',
        version: '1.0.0',
      },
    },
    apis: ['./*.js'],
    ...swaggerJsdocOptions,
  })

  /*
   * Defer execution to allow all routes to be registered first
   */
  setTimeout(() => {
    
    /*
     * Auto-detect Express paths
     */
    const expressPaths = AutoExpressPaths(app);
    // Merge auto-detected paths with manually defined paths from JSDoc comments
    swaggerDocument.paths = mergeDeep(swaggerDocument.paths, expressPaths);

    /*
     * Setup Swagger UI Route
     */
    app.use(
      SWAGGER_PATH,
      SwaggerUI.serve,
      SwaggerUI.setup(swaggerDocument, swaggerUIOptions)
    );

    /*
     * Serve raw JSON Docs
     */
    app.get(SWAGGER_PATH + '.json', (req, res) => {
      res.json(swaggerDocument);
    });

    logger.info(`SwaggerExpress [setup] initialized! (path: ${SWAGGER_PATH}, file: ${SWAGGER_PATH}.json)`);

  }, 100); // Added small delay to ensure stack is populated
}


/**
 * Scans the Express application to automatically generate OpenAPI path objects.
 * @ignore
 * @param {Object} app - The express app instance.
 * @returns {Object} An object containing OpenAPI path definitions.
 */
export function AutoExpressPaths(app) {

  const expressPaths = {};

  // Express 4.x stores routes in `_router.stack`. Fallback to `router.stack` for older versions.
  const stack = app._router?.stack || app.router?.stack || [];
  
  stack.forEach(layer => {
    if (layer.route?.path) {

      let path = layer.route.path;

      // Convert Express parameters (e.g., :id) to OpenAPI format (e.g., {id})
      layer.keys?.forEach(key => {
        path = path.replace(`:${key.name}`, `{${key.name}}`);
      });

      // Initialize path object if it doesn't exist
      expressPaths[path] || (expressPaths[path] = {});

      // Map methods (get, post, etc.)
      Object.keys(layer.route.methods).forEach(method => {
        expressPaths[path][method] = {
          parameters: layer.keys.map(key => ({
            in: 'path',
            name: key.name,
            required: !key.optional,
          })),
          responses: { 200: { description: 'Successful response' } },
        }
      })

    }
  })

  return expressPaths;

}


/**
 * Deep merges two objects.
 * @ignore
 * @param {Object} target - The target object.
 * @param {Object} source - The source object.
 * @returns {Object} The merged object.
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
}
