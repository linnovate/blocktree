/**
 * Graphql Server - Sets up GraphQL middleware using GraphQL Yoga.
 * - Mounts the GraphQL endpoint at `/graphql`.
 * - Includes default `health` Query/Mutation/Subscription and a `/graphql/health` endpoint.
 * - Uses default envs `NODE_ENV` to determine dev/prod mode.
 * - Includes comprehensive logging for request and response cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:GraphqlServer` or `DEBUG=blocktree`
 *
 * @async
 * @function GraphqlServer
 * @requires module:graphql@^16
 * @requires module:graphql-yoga@^5
 * @requires module:@graphql-yoga/plugin-disable-introspection@^2
 * @requires module:@escape.tech/graphql-armor@^3
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} app - The express application instance.
 * @param {Array<Object>|null} schemas - Array of schema definitions to merge.
 * @param {Array<Object>|null} schemas[].directives - Array of directive objects to apply to the schema.
 * @param {string|null} schemas[].directives[].typeDefs - The type definitions for the directive. {@link https://spec.graphql.org/draft/#sec-Type-System.Directives}
 * @param {Function|null} schemas[].directives[].transformer - Function to apply directive logic to the schema. {@link https://the-guild.dev/graphql/tools/docs/schema-directives#imp}
 * @param {string|Array<string>|null} schemas[].typeDefs - The GraphQL type definitions. {@link https://graphql.org/learn/schema}
 * @param {Object|null|Array<Object>} schemas[].resolvers - The resolver map object(s). {@link https://graphql.org/learn/execution} {@link https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions}
 * @param {Object|null} options - Configuration options.
 * @param {boolean|null} options.isDev=process.env.NODE_ENV !== 'production' - Development mode flag.
 * @param {Object|null} options.autoLoadDirs - Configuration for auto-loading schema files.
 * @param {string|Array<string>|null} options.autoLoadDirs.typeDefs - Path(s) to typeDefs directories.
 * @param {string|Array<string>|null} options.autoLoadDirs.resolvers - Path(s) to resolvers directories.
 * @param {string|Array<string>|null} options.autoLoadDirs.directives - Path(s) to directives directories.
 * @param {Object|null} options.armorOptions - Options for `module:@escape.tech/graphql-armor`. {@link https://www.npmjs.com/package/@escape.tech/graphql-armor}
 * @param {Array<Object>|null} options.plugins - Additional GraphQL Yoga plugins.
 * @param {...*|null} ...options - Additional options passed to `module:graphql-yoga`. {@link https://www.npmjs.com/package/graphql-yoga}
 *
 * @returns {Promise<Object>} The initialized Yoga server instance.
 *
 * @example
 * import { GraphqlServer } from '@linnovate/blocktree';
 * GraphqlServer(app);
 */
export async function GraphqlServer(app, schemas = [], {
  isDev = process.env.NODE_ENV !== 'production',
  autoLoadDirs = {
    typeDefs: './src/typeDefs',
    resolvers: ['./src/resolvers'],
    directives: './src/directives',
  },
  armorOptions,
  plugins,
  ...options
} = {}) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  await DynamicImport('graphql@^16'); // Ensure peer dependency is present
  const { createYoga, createSchema, useLogger } = await DynamicImport('graphql-yoga@^5');
  const { useDisableIntrospection } = await DynamicImport('@graphql-yoga/plugin-disable-introspection@^2');
  const { EnvelopArmorPlugin } = await DynamicImport('@escape.tech/graphql-armor@^3');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`GraphqlServer [setup] options`, { namespace: 'GraphqlServer', schemas, options: { isDev, ...options } });

  /*
   * AutoLoad schemas files
   */
  if (autoLoadDirs) {
    const fs = await import('node:fs');
    const path = await import('node:path');

    // Create an array of promises for every file in every directory
    const loadDirs = (dirs) => Promise.all(
      (Array.isArray(dirs) ? dirs : [dirs])?.map(dir => {
        return fs.existsSync(dir) && fs.readdirSync(dir)?.map(async file => {
          const module = await import(path.relative(import.meta.dirname, `${dir}/${file}`));
          return module?.default;
        })
      }).flat()
    ).then(modules => modules.filter(Boolean));

    // Merge to schemas
    schemas || (schemas = []);
    schemas.push({
      typeDefs: await loadDirs(autoLoadDirs.typeDefs),
      resolvers: await loadDirs(autoLoadDirs.resolvers),
      directives: await loadDirs(autoLoadDirs.directives),
    });
  }

  /*
   * Create typeDefs 
   */
  const typeDefs = [`
    scalar JSON
    scalar File
    type Query { health: String }
    type Mutation { health: String }
    type Subscription { health: String }
  `];
  // Merge directive typeDefs
  typeDefs.push(...schemas.map(i => i.directives).flat().map(directive => directive?.typeDefs));
  // Merge schema typeDefs
  typeDefs.push(...schemas.map(i => i?.typeDefs).flat());

  /*
   * Create resolvers 
   */
  const resolvers = [{
    Query: {
      health: (root, args, context, info) => true, // eslint-disable-line no-unused-vars
    },
    Mutation: {
      health: (root, args, context, info) => true, // eslint-disable-line no-unused-vars
    },
    Subscription: {
      health: {
        subscribe: async function* (root, args, context, info) { // eslint-disable-line no-unused-vars
          yield { health: true };
        }
      },
    }
  }];
  // merge base resolvers and schema resolvers
  resolvers.push(...schemas.map(i => i?.resolvers).flat());

  /*
   * Create schema
   */
  let schema = createSchema({ typeDefs, resolvers });
  // add directives transformers
  const directives = schemas.map(i => i.directives).flat();
  schema = directives.reduce((_schema, directive) => directive?.transformer(_schema) || _schema, schema);

  /*
   * Create logger
   */
  const loggerPlugin = useLogger({
    logFn: (eventName, data) => {
      const url = data?.args.contextValue.request.url;
      const { query, variables } = data?.args?.contextValue?.params || {};
      const result = Object.keys(data?.result?.data || []);
      const events = { 'execute-start': 'request', 'execute-end': 'response' }
      logger.debug(`GraphqlServer [${events[eventName] || eventName}]`, { namespace: 'GraphqlServer', url, query, variables, result });
    }
  });

  /*
   * Create instance
   */
  const graphqlServer = createYoga({
    landingPage: false,
    ...options,
    schema,
    healthCheckEndpoint: '/health',
    graphiql: isDev,
    maskedErrors: {
      maskError: (error, message) => {
        logger.error(`GraphqlServer [${message}] ${error.message}`);
      },
      isDev,
    },
    plugins: [
      loggerPlugin,
      isDev ? null : useDisableIntrospection(),
      EnvelopArmorPlugin(armorOptions),
      ...(plugins || []),
    ].filter(Boolean),
  })

  /*
   * Create server
   */
  app?.use?.('/graphql', graphqlServer);

  logger.info(`GraphqlServer [setup] initialized! (mode: ${isDev ? 'dev' : 'prod'}, path: /graphql, health: /graphql/health)`);

  return graphqlServer;

}
