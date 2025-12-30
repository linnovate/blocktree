import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';

// Importing the function to test as requested
import { JwtSessionExpress } from '#linnovate/blocktree';

describe('JwtSessionExpress Integration Test', async () => {
  let app;
  let server;
  let baseUrl;
  const SECRET_KEY = 'super-secret-test-key-123';

  // Setup: Create App, Middleware, and Routes
  before(async () => {
    app = express();

    // 1. Initialize the Middleware
    // We pass the secret key required for signing/verifying the JWT
    await JwtSessionExpress(app, {
      JWT_SECRET_KEY: SECRET_KEY,
      // Optional: Set a specific cookie name if your implementation supports it,
      // otherwise relies on defaults in JwtSession
      cookieName: 'access_token'
    });

    // 2. Define a test route to manipulate the session
    app.get('/test-session', (req, res) => {
      // Check if session exists
      if (!req.jwtSession) {
        return res.status(500).json({ error: 'Session not attached' });
      }

      // Logic: Increment a counter in the reactive session
      const currentCount = req.jwtSession.counter || 0;
      req.jwtSession.counter = currentCount + 1;

      // Logic: Set a custom property
      if (!req.jwtSession.user) {
        req.jwtSession.user = 'test-user';
      }

      res.json({
        count: req.jwtSession.counter,
        user: req.jwtSession.user
      });
    });

    // 3. Start a real server on an ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  // Teardown: Close server
  after(() => {
    if (server) server.close();
  });

  it('should create a session, set a cookie, and persist data across requests', async () => {
    // --- Request 1: Initialize Session ---
    const response1 = await fetch(`${baseUrl}/test-session`);

    assert.strictEqual(response1.status, 200);
    const data1 = await response1.json();

    // Assert initial values
    assert.strictEqual(data1.count, 1);
    assert.strictEqual(data1.user, 'test-user');

    // Extract the 'Set-Cookie' header
    const setCookieHeader = response1.headers.get('set-cookie');
    assert.ok(setCookieHeader, 'Response should contain a Set-Cookie header');

    // Extract the actual token/cookie value to send back
    // (Simple parsing assuming it is the first part before the semicolon)
    const cookieValue = setCookieHeader.split(';')[0];

    // --- Request 2: Persist Session ---
    const response2 = await fetch(`${baseUrl}/test-session`, {
      headers: {
        'Cookie': cookieValue
      }
    });

    assert.strictEqual(response2.status, 200);
    const data2 = await response2.json();

    // Assert values persisted and incremented
    // If the Proxy/JWT logic works, the counter should be 2 now
    assert.strictEqual(data2.count, 2, 'Counter should increment to 2 on second request');
    assert.strictEqual(data2.user, 'test-user', 'User data should persist');
  });

  it('should create a distinct session for a request without cookies', async () => {
    // Making a request without the previous cookie
    const response = await fetch(`${baseUrl}/test-session`);
    const data = await response.json();

    // Should start over at 1
    assert.strictEqual(data.count, 1, 'New request without cookie should reset counter');
  });
});