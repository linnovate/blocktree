import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
// Adjust the path below to point to your actual source file
import { JwtSession } from '#linnovate/blocktree';

describe('JwtSession Integration Tests', () => {
  const SECRET_KEY = 'super_secret_key_for_testing';
  const BASE64_SECRET = Buffer.from(SECRET_KEY).toString('base64');

  it('should return false if essential options are missing', async () => {
    // Missing setCookie and headers
    const result = await JwtSession({
      JWT_SECRET_KEY: SECRET_KEY,
    });
    assert.equal(result, false);
  });

  it('should extract and verify a valid Bearer token from headers', async () => {
    const payload = { userId: 123, role: 'admin' };
    const token = jwt.sign(payload, SECRET_KEY);

    // Mocking the setCookie function to pass validation
    const setCookieStub = () => { };

    const session = await JwtSession({
      headers: { authorization: `Bearer ${token}` },
      setCookie: setCookieStub,
      JWT_SECRET_KEY: SECRET_KEY,
    });

    assert.equal(session.userId, 123);
    assert.equal(session.role, 'admin');
  });

  it('should extract and verify a valid token from Cookies', async () => {
    const payload = { user: 'cookie-monster' };
    const token = jwt.sign(payload, SECRET_KEY);
    const setCookieStub = () => { };

    const session = await JwtSession({
      headers: { cookie: `other=123; token=${token}; secure=true` },
      setCookie: setCookieStub,
      JWT_SECRET_KEY: SECRET_KEY,
      cookieKey: 'token'
    });

    assert.equal(session.user, 'cookie-monster');
  });

  it('should handle Base64 encoded secrets correctly', async () => {
    const payload = { check: 'base64' };
    // Sign with the raw secret
    const token = jwt.sign(payload, SECRET_KEY);
    const setCookieStub = () => { };

    const session = await JwtSession({
      headers: { authorization: `Bearer ${token}` },
      setCookie: setCookieStub,
      // Pass the Base64 encoded version of the secret
      JWT_SECRET_KEY: BASE64_SECRET,
    });

    assert.equal(session.check, 'base64');
  });

  it('should REACTIVELY update the cookie when a property is modified', async () => {
    const payload = { count: 1 };
    const token = jwt.sign(payload, SECRET_KEY);

    // Track calls to setCookie
    let lastCookieKey, lastCookieValue, lastCookieOptions;
    const setCookieSpy = (key, val, options) => {
      lastCookieKey = key;
      lastCookieValue = val;
      lastCookieOptions = options;
    };

    const session = await JwtSession({
      headers: { authorization: `Bearer ${token}` },
      setCookie: setCookieSpy,
      JWT_SECRET_KEY: SECRET_KEY,
      cookieKey: 'my_session'
    });

    // 1. Verify initial state
    assert.equal(session.count, 1);

    // 2. Modify the proxy object
    session.count = 2; // This should trigger the Proxy 'set' trap

    // 3. Assert setCookie was called
    assert.equal(lastCookieKey, 'my_session');
    assert.ok(lastCookieValue, 'A new token should be generated');
    assert.equal(lastCookieOptions.httpOnly, true);

    // 4. Verify the NEW token contains the updated data
    const decoded = jwt.verify(lastCookieValue, SECRET_KEY);
    assert.equal(decoded.count, 2);
  });

  it('should add new properties to the JWT when set on the proxy', async () => {
    const token = jwt.sign({}, SECRET_KEY);

    let lastToken;
    const setCookieSpy = (_, val) => { lastToken = val; };

    const session = await JwtSession({
      headers: { authorization: `Bearer ${token}` },
      setCookie: setCookieSpy,
      JWT_SECRET_KEY: SECRET_KEY,
    });

    // Add a completely new property
    session.isNew = true;

    assert.ok(lastToken);
    const decoded = jwt.verify(lastToken, SECRET_KEY);
    assert.equal(decoded.isNew, true);
  });
});