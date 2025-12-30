import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ElasticClient } from '#linnovate/blocktree';

// Configuration for the mock test
const MOCK_CONFIG = {
  mock: true,            // triggers the internal mock logic
  logPrefix: '[MOCK] ',
  rejectOnError: true,    // ensure errors bubble up
};

describe('ElasticClient Unit Test (With Mock)', async () => {
  let client;

  before(async () => {
    // Initialize the client with mock: true
    client = await ElasticClient(MOCK_CONFIG);

    // Verify client and mockServer exist
    assert.ok(client, 'Client should be initialized');
    assert.ok(client.mockServer, 'mockServer should be attached to the client instance');
  });

  after(async () => {
    if (client) {
      // Clear all mock rules to prevent test pollution
      client.mockServer.clearAll();

      // Close client if necessary (mocks usually don't need closing, but good practice)
      if (client.close) await client.close();
    }
  });

  it('should return the default mock response configured in ElasticClient', async () => {
    // Your ElasticClient code sets a default mock for GET /_search
    // We expect the default: { hits: { total: { value: 1 }, hits: [...] } }

    const response = await client.search({
      index: 'article',
      // query: { match_all: {} } // using body implies POST usually, or client defaults
    });

    const totalHits = response.hits.total.value;
    const firstHit = response.hits.hits[0];

    assert.equal(totalHits, 1, 'Should return the default mock total hits');
    assert.equal(firstHit._id, '1', 'Should return the default mock document ID');
    assert.equal(firstHit._source.text, 'some text', 'Should return the default mock source');
  });

  it('should allow defining a custom mock response for a specific test', async () => {
    // 1. Define a custom mock rule
    const customMockData = {
      hits: {
        total: { value: 50 },
        hits: [
          { _index: 'users', _id: '99', _source: { name: 'John Doe' } }
        ]
      }
    };

    // Use the exposed mockServer to add a rule
    client.mockServer.add(
      { method: 'GET', path: '/users/_search' },
      () => customMockData
    );

    // 2. Perform the request
    const response = await client.search({
      index: 'users',
      // body: { query: { match_all: {} } } // using body implies POST usually, or client defaults
    });

    // 3. Verify the custom data is returned
    assert.equal(response.hits.total.value, 50, 'Should use the custom mock total');
    assert.equal(response.hits.hits[0]._source.name, 'John Doe', 'Should use the custom mock source');
  });

  it('should handle simulated errors', async () => {
    // 1. Simulate a 500 error on a specific path
    client.mockServer.add(
      { method: 'GET', path: '/broken-index/_count' },
      () => {
        // The mock library allows throwing errors or returning error objects
        const err = new Error('Simulated Server Error');
        err.meta = { body: { error: { reason: 'Something went wrong' } }, statusCode: 500 };
        throw err;
      }
    );

    // 2. Expect the client to throw (because rejectOnError is true)
    await assert.rejects(
      async () => {
        await client.count({ index: 'broken-index' });
      },
      (err) => {
        // Verify the error message matches what we logged/threw
        return err.message.includes('Simulated Server Error');
      },
      'Should throw the simulated error'
    );
  });

});