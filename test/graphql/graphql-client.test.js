import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

// Import the function to be tested
// Note: Ensure the relative path matches your project structure
import { GraphqlClient } from '#linnovate/blocktree';

describe('GraphqlClient Integration Tests (Native Node)', async () => {
  let server;
  let serverPort;
  let baseUrl;

  // 1. Setup: Start a real local HTTP server to act as the GraphQL Backend
  before(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        const parsedBody = JSON.parse(body || '{}');

        // default headers
        res.setHeader('Content-Type', 'application/json');

        // Logic to simulate GraphQL responses based on query
        if (parsedBody.query && parsedBody.query.includes('health')) {
          res.writeHead(200);
          res.end(JSON.stringify({ data: { health: 'OK' } }));
          return;
        }

        if (parsedBody.query && parsedBody.query.includes('echoVariables')) {
          res.writeHead(200);
          res.end(JSON.stringify({ data: { variables: parsedBody.variables } }));
          return;
        }

        // Logic to test Authorization header reception
        if (req.headers['authorization'] === 'Bearer test-token') {
            res.writeHead(200);
            res.end(JSON.stringify({ data: { auth: 'granted' } }));
            return;
        }

        // Default Fallback
        res.writeHead(400);
        res.end(JSON.stringify({ errors: [{ message: 'Bad Request' }] }));
      });
    });

    // Listen on a random available port
    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        baseUrl = `http://localhost:${serverPort}/graphql`;
        resolve();
      });
    });
  });

  // 2. Teardown: Close server after tests
  after(() => {
    server.close();
  });

  // 3. Test Cases
  it('should successfully fetch data for a valid query', async () => {
    const result = await GraphqlClient(baseUrl, {
      query: '{ health }'
    });
    // Assert the FetchClient structure (ok, status, data)
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.data, { data: { health: 'OK' } });
  });

  it('should correctly pass variables in the body', async () => {
    const variables = { id: 123, type: 'test' };
    const result = await GraphqlClient(baseUrl, {
      query: 'query($id: Int) { echoVariables(id: $id) }',
      variables
    });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.data, { data: { variables } });
  });

  it('should correctly send Authorization headers', async () => {
    const result = await GraphqlClient(baseUrl, {
      query: '{ checkAuth }',
      authToken: 'Bearer test-token'
    });

    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.data, { data: { auth: 'granted' } });
  });

  it('should handle errors cleanly (400 Bad Request)', async () => {
    // Sending empty query to trigger the server's 400 response
    const result = await GraphqlClient(baseUrl, {
      query: '' 
    });

    // Depending on how your FetchClient handles errors, expect ok: false
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 400);
    assert.ok(result.data.errors);
  });
});