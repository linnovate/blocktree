import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { MongoClient } from '#linnovate/blocktree';
import { Logger, logger } from '#linnovate/blocktree';
await Logger({ DEBUG: 'blocktree', LOG_SERVICE_NAME: 'blocktree' });

describe('MongoClient (Native Node Test)', () => {
  let client;
  let db;

  before(async () => {
    // Initialize the client with mock: true
    // This triggers mongodb-memory-server internally
    client = await MongoClient({
      mock: true,
      logPrefix: '[TEST] '
    });

    if (!client) {
      throw new Error('Failed to initialize MongoClient');
    }

    db = client.db('test_db');
  });

  after(async () => {
    // Cleanup: Close the client connection after tests
    if (client) {
      await client.close();
      await client.mockServer?.stop();
    }
  });
  
  it('should initialize a valid MongoDB client instance', () => {
    assert.ok(client, 'Client instance should be truthy');
    assert.equal(typeof client.db, 'function', 'Client should have a .db() method');
  });

  it('should perform insert and find operations on the mock database', async () => {
    const collection = db.collection('users');
    const mockUser = { name: 'Alice', role: 'admin' };

    // 1. Insert
    const insertResult = await collection.insertOne(mockUser);
    assert.ok(insertResult.acknowledged, 'Insert should be acknowledged');
    assert.ok(insertResult.insertedId, 'Should return an insertedId');

    // 2. Find
    const foundUser = await collection.findOne({ _id: insertResult.insertedId });
    assert.ok(foundUser, 'Should find the inserted document');
    assert.equal(foundUser.name, 'Alice', 'Document content should match');
  });

  it('should maintain Singleton behavior for the same configuration', async () => {
    // Attempt to create a second instance with mock: true
    const client2 = await MongoClient({ mock: true });

    // Assert strictly that they are the exact same object reference
    assert.strictEqual(client, client2, 'MongoClient should return the singleton instance');
  });
});