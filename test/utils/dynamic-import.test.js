import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DynamicImport } from '#linnovate/blocktree';

describe('DynamicImport Integration', () => {

  it('should return null when the module does not exist', async () => {
    // We intentionally request a garbage string to force the .catch() block
    const result = await DynamicImport('non-existent-module-' + Date.now());
    
    // Without mocks, we cannot verify the console.error happened, 
    // but we can verify the function handled it gracefully by returning null.
    assert.strictEqual(result, null, 'Expected function to return null on failure');
  });

  it('should successfully import a standard built-in Node.js module', async () => {
    // We use 'node:path' because it is guaranteed to exist in the environment
    const result = await DynamicImport('node:path');
    
    assert.notStrictEqual(result, null, 'Should return a module object');
    assert.strictEqual(typeof result.join, 'function', 'Should contain exports from the path module');
  });

  it('should not crash when parsing scoped packages', async () => {
    // Tests the regex splitting logic for @scope/pkg format
    const result = await DynamicImport('@dummy-scope/dummy-package');
    
    // We expect null because the package doesn't exist, 
    // but the test passes if it returns null instead of throwing a syntax error.
    assert.strictEqual(result, null);
  });

  it('should load the module even if version checking fails', async () => {
    // We request a version on a built-in module.
    // The code will try to load 'node:path/package.json', which will fail.
    // The internal .catch() should swallow that error and return the module anyway.
    const result = await DynamicImport('node:path@99.9.9');
    
    assert.notStrictEqual(result, null);
    assert.strictEqual(typeof result.resolve, 'function', 'Module functionality remains intact despite missing package.json');
  });
});