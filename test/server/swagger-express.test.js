import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SwaggerExpress, AutoExpressPaths } from '#linnovate/blocktree';

describe('SwaggerExpress Setup', () => {

  test('should register swagger-ui and json routes on the app', async (t) => {
    // Mocking the Express App
    const registeredRoutes = [];
    const appMock = {
      _router: { stack: [] },
      use: (path, ...handlers) => {
        registeredRoutes.push({ path, type: 'middleware' });
      },
      get: (path, handler) => {
        registeredRoutes.push({ path, type: 'get' });
      }
    };

    // Execute the setup
    await SwaggerExpress(appMock, { SWAGGER_PATH: '/api-docs' });

    // Wait for the setTimeout(..., 100) in the source code to finish
    await new Promise(resolve => setTimeout(resolve, 150));

    // Assertions
    const hasSwaggerUI = registeredRoutes.some(r => r.path === '/api-docs');
    const hasJsonRoute = registeredRoutes.some(r => r.path === '/api-docs.json');

    assert.strictEqual(hasSwaggerUI, true, 'Swagger UI route was not registered');
    assert.strictEqual(hasJsonRoute, true, 'Swagger JSON route was not registered');
  });

  test('AutoExpressPaths should correctly parse express parameters', () => {
    const mockApp = {
      _router: {
        stack: [
          {
            route: {
              path: '/user/:id',
              methods: { get: true }
            },
            keys: [{ name: 'id', optional: false }]
          }
        ]
      }
    };

    const paths = AutoExpressPaths(mockApp);
    
    // Check if :id was converted to {id}
    assert.ok(paths['/user/{id}'], 'Path parameter was not converted correctly');
    assert.strictEqual(paths['/user/{id}'].get.parameters[0].name, 'id');
  });
});