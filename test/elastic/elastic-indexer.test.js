/**
 * Test: ElasticIndexer Modes (new, clone, sync)
 * Run with: node --test elastic-indexer-modes.test.js
 */
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ElasticIndexer, ElasticClient } from '#linnovate/blocktree';

describe('ElasticIndexer Modes', async () => {

  let client;
  const INDEX_ALIAS = 'products';
  const OLD_INDEX_NAME = `${INDEX_ALIAS}---2023.01.01_12-00-00`;

  // Track API calls to verify mode logic
  let apiCalls = {
    create: false,
    reindex: false,
    bulk: false,
    aliasSwap: false
  };

  // 1. Setup Singleton Client
  before(async () => {
    client = await ElasticClient({ mock: true, logPrefix: '[TEST] ' });
  });

  // 2. Reset Mocks and State before each test
  beforeEach(() => {
    client.mockServer.clearAll();

    // Reset trackers
    apiCalls = { create: false, reindex: false, bulk: false, aliasSwap: false };

    // --- Common Mocks (Base) ---

    // 1. Get Alias (Simulate existing index)
    client.mockServer.add(
      { method: 'GET', path: `/_alias/${INDEX_ALIAS}` },
      () => ({ [OLD_INDEX_NAME]: { aliases: { [INDEX_ALIAS]: {} } } })
    );

    // 2. Bulk Insert (Always needed)
    client.mockServer.add(
      { method: 'POST', path: `/${INDEX_ALIAS}---*` },
      () => {
        apiCalls.bulk = true;
        return { took: 10, errors: false, items: [] };
      }
    );

    // 3. Cleanup List (Simulate list of indices for cleanup)
    client.mockServer.add(
      { method: 'GET', path: `/${INDEX_ALIAS}---*` },
      () => ({ [OLD_INDEX_NAME]: {} })
    );
  });

  // ======================================================
  // Test Case 1: Mode 'new' (Default Blue/Green)
  // ======================================================
  it('Mode "new": Should CREATE new index, bulk insert, and SWAP alias', async () => {

    // Mock: Create Index
    client.mockServer.add(
      { method: 'PUT', path: `/${INDEX_ALIAS}---*` },
      () => {
        apiCalls.create = true;
        return { acknowledged: true, index: 'new-index' };
      }
    );

    // Mock: Update Alias (Swap)
    client.mockServer.add(
      { method: 'POST', path: '/_aliases' },
      () => {
        apiCalls.aliasSwap = true;
        return { acknowledged: true };
      }
    );

    const result = await ElasticIndexer({
      index: INDEX_ALIAS,
      mode: 'new',
      mock: true
    }, async ({ offset }) => offset === 0 ? [{ id: 1, name: 'Item' }] : []);

    assert.strictEqual(result.error, false);
    assert.strictEqual(apiCalls.create, true, 'Should call PUT to create index');
    assert.strictEqual(apiCalls.reindex, false, 'Should NOT call reindex');
    assert.strictEqual(apiCalls.bulk, true, 'Should perform bulk insert');
    assert.strictEqual(apiCalls.aliasSwap, true, 'Should swap aliases');
  });

  // ======================================================
  // Test Case 2: Mode 'clone' (Reindex -> Swap)
  // ======================================================
  it('Mode "clone": Should REINDEX from old to new, bulk insert, and SWAP alias', async () => {

    // Mock: Reindex
    client.mockServer.add(
      { method: 'POST', path: '/_reindex' },
      () => {
        apiCalls.reindex = true;
        return { took: 100, created: 10 };
      }
    );

    // Mock: Update Alias (Swap)
    client.mockServer.add(
      { method: 'POST', path: '/_aliases' },
      () => {
        apiCalls.aliasSwap = true;
        return { acknowledged: true };
      }
    );

    const result = await ElasticIndexer({
      index: INDEX_ALIAS,
      mode: 'clone',
      mock: true
    }, async ({ offset }) => offset === 0 ? [{ id: 1, name: 'Item' }] : []);

    assert.strictEqual(result.error, false);
    assert.strictEqual(apiCalls.create, false, 'Should NOT call PUT create (reindex handles creation/population)');
    assert.strictEqual(apiCalls.reindex, true, 'Should call _reindex');
    assert.strictEqual(apiCalls.bulk, true, 'Should perform bulk insert');
    assert.strictEqual(apiCalls.aliasSwap, true, 'Should swap aliases');
  });

  // ======================================================
  // Test Case 3: Mode 'sync' (Update In-Place)
  // ======================================================
  it('Mode "sync": Should use EXISTING index, bulk insert, and SKIP alias swap', async () => {

    // No specific mocks needed for Create or Reindex because Sync shouldn't call them.
    // If it tries to call them, the mock server will return 404/Error (since we cleared them), failing the test.

    const result = await ElasticIndexer({
      index: INDEX_ALIAS,
      mode: 'sync',
      mock: true
    }, async ({ offset }) => offset === 0 ? [{ id: 1, name: 'Item' }] : []);

    assert.strictEqual(result.error, false);
    assert.strictEqual(apiCalls.create, false, 'Should NOT create new index');
    assert.strictEqual(apiCalls.reindex, false, 'Should NOT reindex');
    assert.strictEqual(apiCalls.bulk, true, 'Should perform bulk insert on existing index');
    assert.strictEqual(apiCalls.aliasSwap, false, 'Should NOT swap aliases (already pointing to active)');
  });

});

describe('ElasticIndexer Cleanup (keepAliasesCount)', async () => {

  let client;
  const INDEX_ALIAS = 'logs';

  // Define historical indices (Format: name---YYYY.MM.DD_HH-mm-ss)
  // We will simulate 3 existing old indices
  const OLD_1_RECENT = `${INDEX_ALIAS}---2023.12.01_12-00-00`; // Newest old
  const OLD_2_MEDIUM = `${INDEX_ALIAS}---2023.06.01_12-00-00`; // Middle
  const OLD_3_ANCIENT = `${INDEX_ALIAS}---2023.01.01_12-00-00`; // Oldest

  let deletedIndices = [];

  before(async () => {
    client = await ElasticClient({ mock: true, logPrefix: '[TEST] ' });
  });

  beforeEach(() => {
    client.mockServer.clearAll();
    deletedIndices = []; // Reset tracker

    // 1. Basic Setup Mocks (Required for flow to reach cleanup)
    client.mockServer.add(
      { method: 'GET', path: `/_alias/${INDEX_ALIAS}` },
      () => ({ [OLD_1_RECENT]: { aliases: { [INDEX_ALIAS]: {} } } })
    );

    client.mockServer.add(
      { method: 'PUT', path: `/${INDEX_ALIAS}---*` },
      () => ({ acknowledged: true, index: 'new-active-index' })
    );

    client.mockServer.add(
      { method: 'POST', path: `/${INDEX_ALIAS}---*` },
      () => ({ took: 1, errors: false, items: [] })
    );

    client.mockServer.add(
      { method: 'POST', path: '/_aliases' },
      () => ({ acknowledged: true })
    );
  });

  it('Should keep 1 old index and delete the rest when keepAliasesCount = 1', async () => {

    // --- Mocking the Cleanup Phase ---

    // 1. Return the list of ALL indices currently in Elastic
    client.mockServer.add(
      { method: 'GET', path: `/${INDEX_ALIAS}---*` },
      () => ({
        // The newly created active index (will be filtered out by the code logic)
        // Note: The code generates a timestamp, so we simulate *some* active one. 
        // Ideally, the code filters `activeIndexName`, so we won't mock the exact new name here 
        // to simplify, assuming the code handles the active index filtering safely.

        // The Historical Indices:
        [OLD_2_MEDIUM]: {},
        [OLD_1_RECENT]: {},
        [OLD_3_ANCIENT]: {},
      })
    );

    // 2. Capture DELETE requests
    client.mockServer.add(
      { method: 'DELETE', path: '*' },
      ({ path }) => {
        // Path comes in as /index-name
        const indexName = path.substring(1);
        deletedIndices.push(indexName);
        return { acknowledged: true };
      }
    );

    // --- Execution ---

    await ElasticIndexer({
      index: INDEX_ALIAS,
      mock: true,
      keepAliasesCount: 1, // <--- THE KEY PARAMETER
    }, async () => []); // Empty batch to finish quickly

    // --- Assertions ---

    // Logic Check:
    // List: [Recent, Medium, Ancient]
    // keepAliasesCount: 1
    // Result: Keep [Recent]. Delete [Medium, Ancient].

    assert.strictEqual(deletedIndices.length, 2, 'Should have deleted exactly 2 indices');
    assert.ok(deletedIndices.includes(OLD_2_MEDIUM), 'Should delete the medium index');
    assert.ok(deletedIndices.includes(OLD_3_ANCIENT), 'Should delete the ancient index');
    assert.ok(!deletedIndices.includes(OLD_1_RECENT), 'Should NOT delete the most recent old index');
  });

  it('Should delete ALL old indices when keepAliasesCount = 0', async () => {

    client.mockServer.add(
      { method: 'GET', path: `/${INDEX_ALIAS}---*` },
      () => ({ [OLD_1_RECENT]: {}, [OLD_2_MEDIUM]: {} })
    );

    client.mockServer.add(
      { method: 'DELETE', path: '*' },
      ({ path }) => { deletedIndices.push(path.substring(1)); return { acknowledged: true }; }
    );

    await ElasticIndexer({
      index: INDEX_ALIAS,
      mock: true,
      keepAliasesCount: 0, // <--- Delete everything except the currently active one
    }, async () => []);

    assert.strictEqual(deletedIndices.length, 2, 'Should delete all history');
    assert.ok(deletedIndices.includes(OLD_1_RECENT));
    assert.ok(deletedIndices.includes(OLD_2_MEDIUM));
  });

});