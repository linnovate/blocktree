import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import the client (assuming it is saved as fetch-client.js)
import { FetchClient } from '#linnovate/blocktree';

// Configuration
const TEST_PORT = 3000;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths for the logger dependency workaround
const utilsDir = path.resolve(__dirname, '../utils');
const loggerPath = path.join(utilsDir, 'logger.js');

describe('FetchClient (Integration with Real Server)', () => {
  let server;
  let createdUtilsDir = false;
  let createdLoggerFile = false;

  before(async () => {
    // 1. SETUP LOGGING DEPENDENCY (File System)
    // Since we cannot use mocks, we must ensure the file '../utils/logger.js' actually exists.
    if (!fs.existsSync(utilsDir)) {
      fs.mkdirSync(utilsDir, { recursive: true });
      createdUtilsDir = true;
    }
    
    // Create a dummy logger.js if it doesn't exist so the dynamic import works
    if (!fs.existsSync(loggerPath)) {
      const dummyLoggerContent = `
        export async function Logger() {
          return {
            debug: () => {}, 
            error: () => {}
          };
        }
      `;
      fs.writeFileSync(loggerPath, dummyLoggerContent);
      createdLoggerFile = true;
    }

    // 2. START REAL HTTP SERVER
    server = http.createServer((req, res) => {
      // Enable CORS (just in case, though server-to-server fetch doesn't usually care)
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (req.url === '/success-json' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 123, status: 'ok' }));
        return;
      }

      if (req.url === '/success-text' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Raw text body');
        return;
      }

      if (req.url === '/error-404') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Resource not found' }));
        return;
      }

      // Default fallback
      res.writeHead(500);
      res.end();
    });

    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  });

  after(() => {
    // 1. CLEANUP SERVER
    server.close();

    // 2. CLEANUP FILES (Only remove what we created to avoid deleting user's actual files)
    if (createdLoggerFile && fs.existsSync(loggerPath)) {
      fs.unlinkSync(loggerPath);
    }
    if (createdUtilsDir && fs.existsSync(utilsDir)) {
      // Only remove directory if it is empty
      try { fs.rmdirSync(utilsDir); } catch (e) {}
    }
  });

  // --- TESTS ---

  test('should perform a real network request and parse JSON', async () => {
    const response = await FetchClient(`${BASE_URL}/success-json`);

    assert.strictEqual(response.ok, true);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.data, { id: 123, status: 'ok' });
  });

  test('should perform a real network request and parse Text', async () => {
    const response = await FetchClient(`${BASE_URL}/success-text`);

    assert.strictEqual(response.ok, true);
    assert.strictEqual(response.data, 'Raw text body');
  });

  test('should handle actual 404 server errors', async () => {
    const response = await FetchClient(`${BASE_URL}/error-404`);

    assert.strictEqual(response.ok, false);
    assert.strictEqual(response.status, 404);
    assert.deepStrictEqual(response.data, { error: 'Resource not found' });
  });

  test('should handle network connection failures (Offline/Refused)', async () => {
    // Attempt to connect to a port where no server is listening
    const unusedPort = 59999; 
    const response = await FetchClient(`http://localhost:${unusedPort}`);

    // Verify the custom error object structure defined in your catch block
    assert.strictEqual(response.ok, false);
    assert.strictEqual(response.status, null);
    assert.match(response.statusText, /fetch failed|ECONNREFUSED/); // Node's fetch error message
    assert.strictEqual(response.data, null);
  });
});