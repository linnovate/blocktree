import { Logger } from '../utils/logger.js';

/**
 * Graphql Express
 * @function GraphqlExpress
 * @modules [graphql graphql-yoga ws graphql-ws]
 * @envs []
 * @param {object} the express app
 * @param {array} [{
 *   directives: [{
 *     typeDefs: String,      // see: https://spec.graphql.org/draft/#sec-Type-System.Directives
 *     transformer: Function, // see: https://the-guild.dev/graphql/tools/docs/schema-directives#implementing-schema-directives
 *   }]
 *   typeDefs,    // see: https://graphql.org/learn/schema
 *   resolvers,   // see: https://graphql.org/learn/execution
 * }]
 * @param {object} the options {
 *   serverWS,    // the express server
 *   yogaOptions, // see: https://the-guild.dev/graphql/yoga-server/docs
 * }
 * @return {object} express app.next()
 *
 * @example setup Graphql:
   ---------------
   import express from 'express';
   const app = express();
   const server = app.listen(5000);
   GraphqlExpress(app, [{ typeDefs: '', resolvers: {} }], { serverWS: server, yogaOptions: {} });
 *	 
 * @example server WebSocket:
   ---------------------------
   const { createPubSub } = await import('graphql-yoga');
   const pubSub = createPubSub();
   export default {
     Mutation: {
       test: () => pubSub.publish("MY_TEST", { test: true }),
     },
     Subscription: {
       test: {
         subscribe: () => pubsub.subscribe("MY_TEST"),
       }
     }
   }
 *
 * @example client WebSocket:
   ---------------------------
   import { createClient } from 'graphql-ws';
   const client = createClient({ url: 'ws://localhost:5000/graphql' });

   const unsubscribe = client.subscribe({
     query: 'subscription { test }',
   },{
     next: (data) => console.log("next:", data),
     error: (data) => console.log("error:", data),
     complete: (data) => console.log("complete:", data),
   });
*/

export function GraphqlExpress(app, schemas, { serverWS, yogaOptions } = {}) {

  (async function () {

    const logger = await Logger();

    /*
     * Imports
     */
    const { createYoga, createPubSub, createSchema } = await import('graphql-yoga').catch(error => {
      logger.error('GraphqlExpress [missing module]: graphql-yoga');
    });
    const { WebSocketServer } = await import('ws').catch(error => {
      logger.error('GraphqlExpress [missing module]: ws');
    });
    const { useServer } = await import('graphql-ws/lib/use/ws').catch(error => {
      logger.error('GraphqlExpress [missing module]: graphql-ws');
    });

    /*
     * Create typeDefs 
     */
    // add default
    const typeDefs = [`
      scalar JSON
      scalar File
      type Query  {
        health: String
      }
      type Mutation {
        health: String
      }
      type Subscription {
        health: String
      }
    `];
    // add directives
    typeDefs.push(
      ...schemas.map(i => i.directives).flat().map(directive => directive?.typeDefs)
    );
    // add schemas
    typeDefs.push(...schemas.map(i => i?.typeDefs).flat());


    /*
     * Create resolvers 
     */
    const pubSub = createPubSub();
    // add default
    const resolvers = [{
      Query: {
        health: (root, args, context, info) => {
          pubSub.publish("MY_HEALTH", { health: Date().toString() });
          return true;
        }
      },
      Mutation: {
        health: (root, args, context, info) => {
          pubSub.publish("MY_HEALTH", { health: Date().toString() });
          return true;
        }
      },
      Subscription: {
        health: {
          subscribe: (root, args, context, info) => {
            return pubSub.subscribe("MY_HEALTH");
          },
        }
      }
    }];
    // add schemas
    resolvers.push(...schemas.map(i => i?.resolvers).flat());


    /*
     * Create schema
     */
    let schema = createSchema({ typeDefs, resolvers });

    // add directives transformers
    const directives = schemas.map(i => i.directives).flat();
    schema = directives.reduce((_schema, directive) => directive?.transformer(_schema) || _schema, schema);


    /*
     * Create graphql route
     */
    app.use('/graphql', createYoga({ schema, graphiql: true, ...yogaOptions }));


    /*
     * Create graphql WebSocket
     */
    if (serverWS) {
      useServer({ schema }, new WebSocketServer({ server: serverWS, path: '/graphql' }));
    }

  }())

  return (req, res, next) => next();

}
