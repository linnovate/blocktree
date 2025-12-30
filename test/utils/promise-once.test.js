import { describe, it } from 'node:test';
import assert from 'node:assert';
// Adjust the import path to point to your actual file location
import { PromiseOnce } from '#linnovate/blocktree';

describe('PromiseOnce (Native Node Test)', () => {

  it('should resolve with the result of the callback', async () => {
    const id = 'basic-test-' + Date.now();
    const expected = 'success';

    const result = await PromiseOnce(id, async () => expected);

    assert.strictEqual(result, expected);
  });

  it('should prevent concurrent execution for the same ID', async () => {
    const id = 'concurrency-test-' + Date.now();
    let executionCount = 0;

    // A slow async function to simulate work
    const heavyTask = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      executionCount++;
      return 'done';
    };

    // Fire two requests almost simultaneously
    const p1 = PromiseOnce(id, heavyTask);
    const p2 = PromiseOnce(id, heavyTask);

    const [r1, r2] = await Promise.all([p1, p2]);

    // Both promises should resolve to the same value
    assert.strictEqual(r1, 'done');
    assert.strictEqual(r2, 'done');

    // The actual logic should have only run once
    assert.strictEqual(executionCount, 1, 'Callback executed more than once for concurrent requests');
  });

  it('should allow re-execution after the previous promise settles (clean up)', async () => {
    const id = 'cleanup-test-' + Date.now();
    let executionCount = 0;

    const task = async () => {
      executionCount++;
      return 'result';
    };

    // First execution
    await PromiseOnce(id, task);
    assert.strictEqual(executionCount, 1);

    // Second execution (after first is finished)
    await PromiseOnce(id, task);
    assert.strictEqual(executionCount, 2, 'Cache was not cleaned up after the promise settled');
  });

  it('should handle errors and clean up the cache even on failure', async () => {
    const id = 'error-test-' + Date.now();
    let executionCount = 0;

    const failingTask = async () => {
      executionCount++;
      throw new Error('Boom');
    };

    // 1. Expect failure
    await assert.rejects(PromiseOnce(id, failingTask), { message: 'Boom' });

    // 2. Ensure it ran
    assert.strictEqual(executionCount, 1);

    // 3. Retry with a success task - should run again if cache was cleaned
    const successTask = async () => 'recovery';
    const result = await PromiseOnce(id, successTask);

    assert.strictEqual(result, 'recovery');
  });

  it('should treat different IDs as independent operations', async () => {
    const id1 = 'distinct-A-' + Date.now();
    const id2 = 'distinct-B-' + Date.now();

    const results = [];

    const task1 = async () => {
      await new Promise(r => setTimeout(r, 10));
      results.push('A');
      return 'A-Done';
    };

    const task2 = async () => {
      results.push('B');
      return 'B-Done';
    };

    // Run both
    await Promise.all([
      PromiseOnce(id1, task1),
      PromiseOnce(id2, task2)
    ]);

    // Both should have executed
    assert.ok(results.includes('A'));
    assert.ok(results.includes('B'));
    assert.strictEqual(results.length, 2);
  });
});