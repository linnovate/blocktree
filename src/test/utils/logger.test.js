import assert from 'node:assert';
import test from 'node:test';
import { Logger, logger } from '../../utils/logger.js';

test('Logger', (t) => {

  t.beforeEach(() => {
  });

  // ---------------------------------------------------------------------
  t.test('Logger: returns existing instance on subsequent calls (Singleton)', async () => {
    const initialInstance = await Logger({ LOG_SERVICE_NAME: 'test-service-1' });
    assert.strictEqual(logger, initialInstance, 'Exported logger should be the same as the instance');

    const secondCallInstance = await Logger();
    assert.strictEqual(initialInstance, secondCallInstance, 'Logger should return the same singleton instance');
  });

  // ---------------------------------------------------------------------

  t.test('Logger: uses provided options, environment variables, and defaults', async () => {
    process.env.LOG_LEVEL = 'error';
    const LOG_SERVICE_NAME = 'MyTestService';
    await Logger({ LOG_SERVICE_NAME });
    logger.info("print log");
  })
  // ---------------------------------------------------------------------

  // t.test('Logger: falls back to defaults and warns if LOG_SERVICE_NAME is missing', async () => {
  //     const consoleWarnStub = stubMethod(console
  // Logger({ setupOptions: { server, fetch }, details: { codeLine: true, ip: true } });
  // setTimeout(() => logger.info("print log"))

})