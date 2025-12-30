import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert';
// We import the real modules. 
// Assumption: MongoClient's "mock: true" uses a shared/static storage in memory, 
// allowing us to inspect the data inserted by MongoIndexer.
import { MongoIndexer, MongoClient } from '#linnovate/blocktree';
// process.env.DEBUG='blocktree:MongoIndexer'
describe('MongoIndexer (Integrated Mock)', () => {
  let client;
  let db;

  // 1. Setup: Connect to the mocked DB instance to verify data
  beforeEach(async () => {
    // We get a handle to the DB to run assertions
    client = await MongoClient({ mock: true });
    db = client.db();

    // Clean slate: Drop the specific database or collections before each test
    // (Assuming the mock supports dropDatabase, otherwise we list and drop collections)
    try {
      const collections = await db.listCollections().toArray();
      for (const col of collections) {
        await db.dropCollection(col.name);
      }
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  });

  // 2. Teardown: Close client connection (if applicable in mock)
  after(async () => {
    // Cleanup: Close the client connection after tests
    if (client) {
      await client.close();
      await client.mockServer?.stop();
    }
  });

  it('should successfully index data in "new" mode', async () => {
    const alias = 'users';

    // Act: Run Indexer with mock: true
    const result = await MongoIndexer(
      {
        index: alias,
        mode: 'new',
        mock: true,        // Activates the internal mock
        logPrefix: 'TEST:' // Optional: distinct logging
      },
      async ({ offset }) => {
        if (offset === 0) return [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
        return [];
      }
    );

    // Assert: No errors returned
    assert.strictEqual(result.error, false, `Indexer failed with error: ${result.error}`);

    // Assert: Verify data in the Mock DB
    const data = await db.collection(alias).find({}).toArray();
    assert.strictEqual(data.length, 2, 'Should have inserted 2 documents into the alias');
    assert.strictEqual(data.find(d => d.id === 1)?.name, 'Alice');
  });

  it('should handle "clone" mode (copy + update)', async () => {
    const alias = 'products';

    // Setup: Pre-populate the "Live" index via direct DB access
    await db.collection(alias).insertMany([
      { id: 'p1', price: 100 },
      { id: 'p2', price: 200 }
    ]);

    // Act: Run Indexer in CLONE mode
    await MongoIndexer(
      { index: alias, mode: 'clone', mock: true },
      async ({ offset }) => {
        // Update p2, Insert p3
        if (offset === 0) return [{ id: 'p2', price: 250 }, { id: 'p3', price: 300 }];
        return [];
      }
    );

    // Assert
    const data = await db.collection(alias).find({}).toArray();

    // Should have 3 items: p1 (cloned), p2 (updated), p3 (new)
    assert.strictEqual(data.length, 3);
    assert.strictEqual(data.find(d => d.id === 'p1').price, 100, 'Cloned data should be preserved');
    assert.strictEqual(data.find(d => d.id === 'p2').price, 250, 'Existing data should be updated');
  });

  it('should handle "sync" mode (direct update, no rotation)', async () => {
    const alias = 'metadata';

    // Setup
    await db.collection(alias).insertOne({ id: 'config', status: 'off' });

    // Act
    await MongoIndexer(
      { index: alias, mode: 'sync', mock: true },
      async ({ offset }) => (offset === 0 ? [{ id: 'config', status: 'on' }] : [])
    );

    // Assert
    const data = await db.collection(alias).find({}).toArray();
    assert.strictEqual(data[0].status, 'on', 'Should update the document in place');

    // Verify no temporary indices were left behind (Sync mode shouldn't create timestamps)
    const collections = await db.listCollections().toArray();
    const indexVariants = collections.filter(c => c.name.startsWith(`${alias}---`));
    assert.strictEqual(indexVariants.length, 0, 'Sync mode should not create timestamped indices');
  });

  it('should execute the testCallback before swapping aliases', async () => {
    const alias = 'validation-test';
    let callbackExecuted = false;

    await MongoIndexer(
      { index: alias, mock: true },
      async ({ offset }) => (offset === 0 ? [{ id: 1 }] : []),
      // Test Callback
      async ({ index: targetAlias, activeIndexName }) => {
        callbackExecuted = true;
        // Verify that at this moment (before swap), the active index is NOT the alias name
        assert.notStrictEqual(activeIndexName, targetAlias);
        return true;
      }
    );

    assert.ok(callbackExecuted, 'testCallback should have been executed');
  });
});