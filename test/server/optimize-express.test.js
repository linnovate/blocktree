import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express'; // Requires: npm install express

// We will dynamically import the function under test to allow setup of prerequisites first
let OptimizeExpress;

describe('OptimizeExpress (Integration)', () => {
  const utilsDir = path.resolve('./utils');

  // 1. SETUP: Generate real utility files required by the target file
  // This ensures we are testing "real" code paths, not mocks.
  before(async () => {
    if (!fs.existsSync(utilsDir)) {
      fs.mkdirSync(utilsDir, { recursive: true });
    }

    // Create a real working DynamicImport utility
    fs.writeFileSync(
      path.join(utilsDir, 'dynamic-import.js'),
      `export const DynamicImport = async (pkg) => {
         // Strip version numbers (e.g., 'compression@^1' -> 'compression')
         const cleanName = pkg.split('@')[0]; 
         return import(cleanName);
       };`
    );

    // Create a real working Logger utility
    fs.writeFileSync(
      path.join(utilsDir, 'logger.js'),
      `export const Logger = async () => ({
         debug: (msg) => console.log('[DEBUG]', msg),
         info: (msg) => console.log('[INFO]', msg)
       });`
    );

    // Import the file under test AFTER creating dependencies
    const module = await import('#linnovate/blocktree');
    OptimizeExpress = module.OptimizeExpress;
  });

  // 2. TEARDOWN: Clean up the generated files
  after(() => {
    fs.rmSync(utilsDir, { recursive: true, force: true });
  });

  it('should actually compress the HTTP response', async () => {
    const app = express();

    // 1. Initialize the Optimization Middleware
    await OptimizeExpress(app, {
      compressionOptions: { threshold: 0 } // Force compression even for small bodies
    });

    // 2. Setup a dummy route with a payload
    // We send a JSON body to ensure there is content to compress
    app.get('/test', (req, res) => {
      res.json({ message: 'This is a test payload that should be gzipped', data: 'x'.repeat(1000) });
    });

    // 3. Start the server
    const server = app.listen(0); // 0 lets OS pick a random free port
    const port = server.address().port;

    try {
      // 4. Make a real HTTP request
      const response = await fetch(`http://localhost:${port}/test`);
      
      // 5. Verify the headers
      const encoding = response.headers.get('content-encoding');
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(encoding, 'gzip', 'Response should have content-encoding: gzip');
      
      // Verify we can still read the data
      const data = await response.json();
      assert.ok(data.message, 'Response body should remain valid JSON');

    } finally {
      // Ensure server closes even if test fails
      server.close();
    }
  });

  it('should not break on default options', async () => {
    const app = express();
    // Test without passing the options object
    await assert.doesNotReject(async () => await OptimizeExpress(app));
  });
});