import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GraphqlServer } from '#linnovate/blocktree';

// Helper to interact with the Yoga instance using standard Fetch API
async function executeQuery(server, query, variables = {}) {
  const response = await server.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

describe('GraphqlServer Integration Tests', () => {
  // A minimal Express-like app stub to satisfy the 'app' parameter
  const mockApp = {
    routes: {},
    use(path, handler) {
      this.routes[path] = handler;
    },
  };

  it('should initialize and mount the health check endpoint', async () => {
    const server = await GraphqlServer(mockApp, [], {
      // Disable autoload to focus on core logic
      autoLoadDirs: null
    });

    // 1. Assert the server was mounted to the app
    assert.ok(mockApp.routes['/graphql'], 'GraphQL server should be mounted at /graphql');

    // 2. Perform a real query against the health endpoint
    const result = await executeQuery(server, `query { health }`);

    // Note: The schema defines health as String, but resolver returns boolean true.
    // GraphQL Yoga typically coerces this. We check for existence.
    assert.strictEqual(result.data.health, 'true', 'Health query should return "true"');
  });

  it('should merge custom schemas and resolvers correctly', async () => {
    const customSchema = {
      typeDefs: `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'world',
        },
      },
    };

    const server = await GraphqlServer(mockApp, [customSchema], {
      autoLoadDirs: null
    });

    const result = await executeQuery(server, `query { hello }`);

    assert.deepStrictEqual(result.data, { hello: 'world' }, 'Should resolve custom schema fields');
    assert.strictEqual(result.errors, undefined, 'Should not have any errors');
  });

  it('should apply directives to the schema', async () => {
    // We test this by creating a directive that uppercases a string
    const directiveTypeDefs = `
      directive @upper on FIELD_DEFINITION
    `;

    // A transformer function (SchemaDirectiveVisitor pattern logic for Yoga/Tools)
    const directiveTransformer = (schema) => {
      // Note: Since we are in "native" mode, simpler to just return schema unmodified 
      // if we don't want to import heavy tools, but here is how we assert the transformer is called.

      // For this test, we just want to prove the transformer hook runs.
      schema._testDirectiveApplied = true;
      return schema;
    };

    const customDirective = {
      directives: [{
        typeDefs: directiveTypeDefs,
        transformer: directiveTransformer
      }]
    };

    const server = await GraphqlServer(mockApp, [customDirective], {
      autoLoadDirs: null
    });

    // Access the internal schema to verify transformation
    const schema = server.getEnveloped().schema;
    assert.strictEqual(schema._testDirectiveApplied, true, 'Directive transformer should have been executed');
  });

  it('should disable introspection in production mode', async () => {
    // Initialize with isDev: false
    const server = await GraphqlServer(mockApp, [], {
      isDev: false,
      autoLoadDirs: null
    });

    // Introspection Query
    const introspectionQuery = `
      query {
        __schema {
          types {
            name
          }
        }
      }
    `;

    const result = await executeQuery(server, introspectionQuery);

    // Depending on the exact plugin version, it either returns an error or empty data
    // The standard behavior for disable-introspection plugin is to throw a validation error
    assert.ok(result.errors, 'Introspection should return errors in production');
    assert.match(
      result.errors[0].message,
      /GraphQL introspection has been disabled/i,
    );
  });

  it('should enable introspection in dev mode', async () => {
    // Initialize with isDev: true
    const server = await GraphqlServer(mockApp, [], {
      isDev: true,
      autoLoadDirs: null
    });

    const introspectionQuery = `
      query {
        __schema {
          queryType {
            name
          }
        }
      }
    `;

    const result = await executeQuery(server, introspectionQuery);

    assert.strictEqual(result.errors, undefined, 'Introspection should not have errors in dev mode');
    assert.strictEqual(result.data.__schema.queryType.name, 'Query');
  });
});