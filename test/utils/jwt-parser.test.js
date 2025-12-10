import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { JWTParser } from '#linnovate/blocktree';

describe('JWTParser Component', () => {
  const TEST_SECRET = 'test-secret-key-123456';
  const TEST_PAYLOAD = { userId: '123', role: 'admin' };
  let validToken;

  // Setup: Generate a valid token before running tests
  before(() => {
    process.env.JWT_SECRET_KEY = TEST_SECRET;
    validToken = jwt.sign(TEST_PAYLOAD, TEST_SECRET);
  });

  // Cleanup: Reset env vars after tests
  after(() => {
    delete process.env.JWT_SECRET_KEY;
  });

  it('should successfully decode and verify a valid token', async () => {
    const result = await JWTParser(validToken, TEST_SECRET);

    assert.ok(result, 'Result should not be null');
    assert.strictEqual(result.userId, TEST_PAYLOAD.userId);
    assert.strictEqual(result.role, TEST_PAYLOAD.role);
  });

  it('should return null for an invalid token', async () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    const result = await JWTParser(invalidToken, TEST_SECRET);

    assert.strictEqual(result, null, 'Should return null when verification fails');
  });

  it('should return null if the wrong secret is used', async () => {
    const wrongSecretToken = jwt.sign(TEST_PAYLOAD, 'wrong-secret');
    const result = await JWTParser(wrongSecretToken, TEST_SECRET);

    assert.strictEqual(result, null, 'Should return null if signature does not match secret');
  });

  it('should fallback to process.env.JWT_SECRET_KEY if second argument is missing', async () => {
    // Ensure env is set
    process.env.JWT_SECRET_KEY = TEST_SECRET;
    
    const result = await JWTParser(validToken); // No secret passed

    assert.ok(result);
    assert.strictEqual(result.userId, TEST_PAYLOAD.userId);
  });

  it('should handle Base64 encoded secrets correctly', async () => {
    // 1. Create a secret and base64 encode it
    const rawSecret = 'complex-secret-key';
    const base64Secret = Buffer.from(rawSecret).toString('base64');
    
    // 2. Create a token signed with the RAW secret (because that's how JWT works)
    const token = jwt.sign(TEST_PAYLOAD, rawSecret);

    // 3. Pass the BASE64 secret to the parser (simulating K8s secrets/env vars)
    const result = await JWTParser(token, base64Secret);

    assert.ok(result, 'Should decode base64 key internally and verify token');
    assert.strictEqual(result.userId, TEST_PAYLOAD.userId);
  });

  it('should handle missing secrets gracefully (logging error)', async () => {
    // Save current env
    const originalEnv = process.env.JWT_SECRET_KEY;
    delete process.env.JWT_SECRET_KEY;

    // Mock logger if needed, or rely on internal safe returns
    // In this specific file implementation, it returns undefined if no secret is found
    const result = await JWTParser(validToken, undefined);

    assert.strictEqual(result, undefined, 'Should return undefined if no secret is provided');

    // Restore env
    process.env.JWT_SECRET_KEY = originalEnv;
  });
});