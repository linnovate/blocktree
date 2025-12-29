import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { MongoIndexerRestore, MongoClient } from '#linnovate/blocktree';

describe('MongoIndexerRestore', () => {
  const indexName = 'users';
  const backupNameOld = 'users---2023.01.01_10-00-00';
  const backupNameNew = 'users---2023.01.02_12-00-00';

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
  
  it('should successfully restore an index using lastIndexCount and mock data', async () => {
    // Clean start (optional, depending on mock implementation)
    const existingColls = await db.listCollections().toArray();
    for (const col of existingColls) {
      await db.dropCollection(col.name);
    }

    // Seed: Create the "current" public index
    await db.createCollection(indexName);
    // Seed: Create backup indices
    await db.createCollection(backupNameOld);
    await db.createCollection(backupNameNew); // This is the most recent backup

    // Verify seed state
    let collections = await db.listCollections().toArray();
    let names = collections.map(c => c.name);
    assert.ok(names.includes(indexName));
    assert.ok(names.includes(backupNameNew));

    // 2. Action: Run the restore function
    const success = await MongoIndexerRestore({
      index: indexName,
      lastIndexCount: 1, // Should target the newest backup (backupNameNew)
      mock: true // Pass mock option to the function
    });

    // 3. Assertion: Check function return value
    assert.strictEqual(success, true, 'MongoIndexerRestore should return true');

    // 4. Assertion: Verify DB state
    collections = await db.listCollections().toArray();
    names = collections.map(c => c.name);

    // The backup (backupNameNew) should now be the public index ('users')
    // Note: In a real mock, we might verify UUIDs or content, but checking names is standard for rename logic.
    assert.ok(names.includes(indexName), 'The public index alias should exist after restore');
    
    // The previous 'users' index should have been renamed to a new backup timestamp
    // We check for a collection that starts with 'users---' and is NOT the old static backups
    const newBackup = names.find(n => 
      n.startsWith(`${indexName}---`) && 
      n !== backupNameOld && 
      n !== backupNameNew
    );

    assert.ok(newBackup, 'The original public index should have been renamed to a new backup timestamp');
    
    // Log for verification
    console.log('Test successful. New backup created:', newBackup);
  });

  it('should return false if validation fails (missing index)', async () => {
    const success = await MongoIndexerRestore({
      lastIndexCount: 1,
      mock: true
    });
    assert.strictEqual(success, undefined, 'Should fail/return undefined or log error when index is missing');
    // Note: Based on your code, it returns logger.error which might be undefined or void depending on logger implementation.
  });
});