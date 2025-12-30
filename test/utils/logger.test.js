import { test, describe } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';

// Pre-set environment variables before importing the logger
// to ensure they are picked up during the first cycle if needed.
process.env.LOG_SERVICE_NAME = 'test-service';
process.env.DEBUG = 'blocktree:Server, blocktree:User';

// Import the module to test
import { Logger, logger as exportedLogger } from '#linnovate/blocktree';

describe('Logger Component', () => {
  let loggerInstance;

  // Mock Server Object acting as an EventEmitter
  const mockServer = new EventEmitter();
  // Spy functionality to track if .on() was called
  let serverOnSpy = 0;
  const originalOn = mockServer.on;
  mockServer.on = (event, callback) => {
    serverOnSpy++;
    return originalOn.call(mockServer, event, callback);
  };

  test('should export an undefined logger binding before initialization', () => {
    // Note: This relies on the import order. In ESM, bindings are live.
    // If Logger() hasn't resolved yet, this might be undefined.
    // However, since we awaited the import, check if it's undefined or not initialized.
    // In this specific singleton implementation, it starts undefined.
    assert.strictEqual(typeof exportedLogger, 'undefined');
  });

  test('should initialize Logger and return a Pino instance', async () => {
    loggerInstance = await Logger({
      server: mockServer,
      // Overriding options to ensure specific test behavior
      DEBUG: 'blocktree:Server',
      LOG_SERVICE_NAME: 'test-logger'
    });

    assert.ok(loggerInstance, 'Logger instance should be defined');
    assert.strictEqual(typeof loggerInstance.info, 'function', 'Instance should have .info() method');
    assert.strictEqual(typeof loggerInstance.debug, 'function', 'Instance should have .debug() method');
  });

  test('should populate the exported "logger" binding after initialization', () => {
    assert.ok(exportedLogger, 'Exported logger binding should now be defined');
    assert.strictEqual(exportedLogger, loggerInstance, 'Exported binding should match the returned instance');
  });

  test('should return the same instance (Singleton) on second call', async () => {
    const secondInstance = await Logger({ LOG_SERVICE_NAME: 'changed-name' });

    assert.strictEqual(secondInstance, loggerInstance, 'Should return the exact same instance object');
    // Verify that the name didn't change (proving the first config stuck)
    // Note: Accessing internal options of pino might differ by version, 
    // but the object reference equality is the strongest test here.
  });

  test('should attach request logger to server when "Server" namespace is in DEBUG', () => {
    // We initialized with DEBUG: 'blocktree:Server' and passed a server.
    // The logger logic checks `debugByNamespace`.

    // Check if the 'request' listener was added to the server
    const requestListeners = mockServer.listeners('request');

    // Our spy count should be > 0 or we check the listener count
    assert.ok(serverOnSpy > 0, 'Server.on should have been called');
    assert.ok(requestListeners.length > 0, 'Server should have a request listener attached');
  });

  test('should format logs correctly (Log Hook Logic)', async () => {
    // Since we cannot easily intercept stdout without piping, 
    // we test that the logging methods run without throwing errors.

    assert.doesNotThrow(() => {
      loggerInstance.info('Test info message');
    });

    assert.doesNotThrow(() => {
      loggerInstance.debug('Test debug message', { userId: 123 });
    });
  });

  test('Server request listener should log when event is emitted', () => {
    // Mock a request object
    const mockReq = {
      method: 'GET',
      url: '/api/test',
      socket: { remoteAddress: '127.0.0.1' }
    };

    // We mock the debug method of the instance to verify it's called
    // Note: This is invasive but necessary to verify the callback logic
    let debugCalled = false;
    const originalDebug = loggerInstance.debug;

    loggerInstance.debug = (msg, data) => {
      if (msg.includes('Server [request]')) {
        debugCalled = true;
        assert.match(msg, /Server \[request\] \[GET\]\/api\/test/);
        assert.strictEqual(data.namespace, 'Server');
      }
    };

    // Emit the request event on the server
    mockServer.emit('request', mockReq);

    // Restore original method
    loggerInstance.debug = originalDebug;

    assert.ok(debugCalled, 'The server request listener should trigger the logger.debug method');
  });
});