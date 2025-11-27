/**
 * Graphql Server
 * @function GraphqlServer
 * @modules [graphql@^16 graphql-yoga@^5 @graphql-yoga/plugin-disable-introspection@^2 @escape.tech/graphql-armor@^3 pino@^10]
 * @envs [NODE_ENV]
 * @param {Array<Object>} schemas Array of schema definitions to merge. Each object should contain:
 * @param {Array<Object>} [schemas.directives] Array of directive objects to apply to the schema:
 * @param {string} schemas.directives.typeDefs The type definitions for the directive (e.g., 'directive @myDir...') see: https://spec.graphql.org/draft/#sec-Type-System.Directives.
 * @param {function} schemas.directives.transformer The function to apply the directive logic to the schema (using mapSchema or similar) see: https://the-guild.dev/graphql/tools/docs/schema-directives#imp.
 * @param {string|Array<string>} schemas.typeDefs The GraphQL type definitions (schema language) see: https://graphql.org/learn/schema.
 * @param {object|Array<object>} schemas.resolvers The resolver map object(s) see: https://graphql.org/learn/execution & https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions.
 * @param {object} options The options object for GraphQL Yoga server:
 * @param {object} [options.armorConfig] The configuration object for `@escape.tech/graphql-armor`.
 * @param {object} [options.plugins] An array of additional GraphQL Yoga plugins.
 * @param {object} [options.NODE_ENV] disable graphiql/introspection/errors handlers (default: process.env.NODE_ENV).
 * @param {object} [options] All other options for `createYoga` (e.g., `context`, `cors`, etc.).
 * @return {Promise<boolean>} Resolves to `true` when setup is complete.
 * @logger {info} print the starting process
 * @logger {debug} print the setup schemas/options, print the execute data url/query/variables/result
 * @example:
 * ---------------
 * // with express
 * import express from 'express';
 * const app = express();
 * const server = app.listen(5000);
 * app.use("/graphql", await GraphqlServer([{ typeDefs: '', resolvers: {} }]) );
 * // with node:http
 * import { createServer } from 'node:http';
 * const server = createServer(await GraphqlServer([{ typeDefs: '', resolvers: {} }]) );
 * server.listen(4000);
*/
export async function GraphqlServer(schemas = [], {
  isDev = process.env.NODE_ENV !== 'production',
  autoLoadDirs = {
    typeDefs: "./src/typeDefs",
    resolvers: ["./src/resolvers"],
    directives: "./src/directives",
  },
  ...options
} = {}) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  await DynamicImport('graphql@^16');
  const { createYoga, createSchema, useLogger } = await DynamicImport('graphql-yoga@^5');
  const { useDisableIntrospection } = await DynamicImport('@graphql-yoga/plugin-disable-introspection@^2');
  const { EnvelopArmorPlugin } = await DynamicImport('@escape.tech/graphql-armor@^3');
  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`GraphqlServer [setup] options`, { schemas, options: { isDev, ...options } });

  /*
   * AutoLoad schemas files
   */
  if (autoLoadDirs) {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const loadDirs = (dirs) => Promise.all(
      (Array.isArray(dirs) ? dirs : [dirs])?.map(dir => {
        return fs.existsSync(dir) && fs.readdirSync(dir)?.map(async file => {
          const module = await import(path.relative(import.meta.dirname, `${dir}/${file}`));
          return module?.default;
        })
      }).flat()
    ).then(modules => modules.filter(Boolean));

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
  // merge directive typeDefs and schema typeDefs
  typeDefs.push(...schemas.map(i => i.directives).flat().map(directive => directive?.typeDefs));
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
      const events = { "execute-start": "request", "execute-end": "response" }
      logger.debug(`GraphqlServer [${events[eventName] || eventName}]`, { url, query, variables, result });
    }
  });

  /*
   * Create server
   */
  const graphqlServer = createYoga({
    schema,
    landingPage: false,
    healthCheckEndpoint: '/health',
    graphiql: isDev,
    maskedErrors: {
      maskError: (error, message) => {
        logger.error(`GraphqlServer [${message}] ${error.message}`, { stack: error.stack });
      },
      isDev,
    },
    ...options,
    plugins: [
      loggerPlugin,
      isDev ? null : useDisableIntrospection(),
      EnvelopArmorPlugin(options?.armorConfig),
      ...(options?.plugins || []),
    ].filter(Boolean),
  })

  logger.info(`GraphqlServer [setup] starting! (mode: ${isDev ? "dev" : "prod"})`);

  return graphqlServer;

}
