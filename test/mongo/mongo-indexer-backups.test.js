import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoIndexerBackups, MongoClient } from '#linnovate/blocktree';

describe('MongoIndexerBackups', () => {
  let client;
  let db;

  // Configuration
  const indexAlias = 'users';
  const mockOptions = { mock: true };

  before(async () => {
    // 1. Initialize the Mock Client to seed data
    client = await MongoClient(mockOptions);
    db = await client.db();

    // 2. Create collections to simulate backups
    // Expected format: alias---YYYY.MM.DD_HH-mm-ss

    // An old backup
    await db.createCollection(`${indexAlias}---2023.01.01_10-00-00`);

    // A newer backup (Should be first in the result)
    await db.createCollection(`${indexAlias}---2023.06.15_14-30-00`);

    // An irrelevant collection (different alias)
    await db.createCollection('orders---2023.01.01_10-00-00');

    // A standard collection (no timestamp)
    await db.createCollection('users');
  });

  after(async () => {
    // Cleanup: Close the client connection after tests
    if (client) {
      await client.close();
      await client.mockServer?.stop();
    }
  });

  it('should retrieve and sort backup indices descending by date', async () => {
    // Act
    const result = await MongoIndexerBackups({
      index: indexAlias,
      ...mockOptions
    });

    // Assert
    // 1. Check if 'actives' returns the requested index
    assert.deepEqual(result.actives, [indexAlias]);

    // 2. Check if it filtered out 'orders' and unstructured names
    assert.equal(result.indices.length, 2);

    // 3. Check specific order (Desc - Newest First)
    const expectedIndices = [
      'users---2023.06.15_14-30-00',
      'users---2023.01.01_10-00-00'
    ];

    assert.deepEqual(result.indices, expectedIndices);
  });

  it('should return empty array if no matching backups exist', async () => {
    const result = await MongoIndexerBackups({
      index: 'non-existent',
      ...mockOptions
    });

    assert.deepEqual(result.indices, []);
    assert.deepEqual(result.actives, ['non-existent']);
  });
});