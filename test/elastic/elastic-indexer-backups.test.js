import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ElasticIndexerBackups, ElasticClient } from '#linnovate/blocktree';

describe('ElasticIndexerBackups Unit Test (Using Elastic Mock)', async () => {
  let mockServer;
  const testAlias = 'users';

  before(async () => {
    // 1. Initialize the Singleton Client explicitly to get access to the mockServer
    const client = await ElasticClient({ mock: true, logPrefix: '[TEST-SETUP] ' });
    mockServer = client.mockServer;

    // 2. Define the Mock Response
    // We simulate 3 indices:
    // - Index 1: Oldest (2023), NOT active
    // - Index 2: Middle (2024), ACTIVE (has the alias)
    // - Index 3: Newest (2025), NOT active
    const mockIndicesResponse = {
      [`${testAlias}---2023.01.01_10-00-00`]: {
        aliases: {} // No alias
      },
      [`${testAlias}---2024.01.01_10-00-00`]: {
        aliases: { [testAlias]: {} } // This one is ACTIVE
      },
      [`${testAlias}---2025.01.01_10-00-00`]: {
        aliases: {} // No alias
      }
    };

    // 3. Register the mock rule for the pattern used in ElasticIndexerBackups
    mockServer.add(
      { method: 'GET', path: `/${testAlias}---*` },
      () => mockIndicesResponse
    );
  });

  after(async () => {
    if (mockServer) mockServer.clearAll();
  });

  it('should return indices sorted by date descending', async () => {
    // Run the function
    const { indices } = await ElasticIndexerBackups({
      index: testAlias,
      mock: true
    });

    assert.equal(indices.length, 3, 'Should return all 3 mocked indices');

    // Validate Sort Order (Newest First)
    const newest = `${testAlias}---2025.01.01_10-00-00`;
    const oldest = `${testAlias}---2023.01.01_10-00-00`;

    assert.equal(indices[0], newest, 'First index should be the newest (2025)');
    assert.equal(indices[2], oldest, 'Last index should be the oldest (2023)');
  });

  it('should identify the currently active index correctly', async () => {
    // Run the function
    const { actives } = await ElasticIndexerBackups({
      index: testAlias,
      mock: true
    });

    const expectedActive = `${testAlias}---2024.01.01_10-00-00`;

    assert.equal(actives.length, 1, 'Should find exactly one active index');
    assert.equal(actives[0], expectedActive, 'Should match the index with the alias attached');
  });

  it('should handle missing options gracefully', async () => {
    const result = await ElasticIndexerBackups({ index: null, mock: true });
    assert.equal(result, undefined, 'Should return undefined if index is missing');
  });
});