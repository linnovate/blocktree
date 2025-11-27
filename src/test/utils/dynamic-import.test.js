import assert from 'node:assert';
import test from 'node:test';
import { DynamicImport } from '../../utils/dynamic-import.js';

const moduleName = './dynamic-import.js@^33';

test('should successfully import a module when no version is specified', async () => {
  const result = await DynamicImport(moduleName);
  assert.strictEqual(result?.DynamicImport, DynamicImport, 'The result should be the mocked module');
});
