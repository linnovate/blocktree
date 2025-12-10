/**
 * Rabbitmq Client - Singleton Rabbitmq instance.
 * - Uses default envs: `RABBITMQ_URI`.
 * - To enable debug logs set env: `DEBUG=blocktree:RabbitmqClient` or `DEBUG=blocktree`
 * 
 * @async
 * @function RabbitmqClient
 * @requires module:amqplib@^0.10
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.RABBITMQ_URI=process.env.RABBITMQ_URI - Connection string (amqp://[[username][:password]@][host][:port]).
 * @param {string} options.logPrefix - Prefix for log messages.
 * @param {Object|null} ...options - Additional standard `module:amqplib` options. {@link https://www.npmjs.com/package/amqplib}
 *
 * @returns {Promise<Object>} The initialized Rabbitmq Connection instance.
 *
 * @example
 * import { RabbitmqClient } from '@linnovate/blocktree';
 * const rabbitmq = await RabbitmqClient({ RABBITMQ_URI: 'amqp://localhost:5672' });
 * const channel = await rabbitmq?.createChannel(); 
 * await channel?.assertQueue('queue', { durable: false });
 * channel?.consume('queue', (msg) => console.log(msg?.content.toString()));
 * channel?.sendToQueue('queue', Buffer.from('something to do'));
 *
 * @example
# docker-compose.yaml for Rabbitmq
services:
  rabbitmq:
    image: rabbitmq:4
    environment:
      RABBITMQ_DEFAULT_USER: root
      RABBITMQ_DEFAULT_PASS: root
    ports:
      - 5672:5672
      - 15672:15672
    volumes:
      - ./rabbitmq:/var/lib/rabbitmq
  */
const $instances = {};

export async function RabbitmqClient({
  RABBITMQ_URI = process.env.RABBITMQ_URI,
  logPrefix = '',
  ...options
} = {}) {

  // Create a unique key for the singleton based on RABBITMQ_URI
  const instanceKey = `${RABBITMQ_URI}`;
  
  /*
   * Return Singleton if exists
   */
  if ($instances[instanceKey]) {
    return $instances[instanceKey];
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const amqplib = await DynamicImport('amqplib@^0.10');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Validation
   */
  if (!RABBITMQ_URI) {
    logger.error(`${logPrefix}RabbitmqClient [missing env]: RABBITMQ_URI`);
    return;
  }
  logger.debug(`${logPrefix}RabbitmqClient [setup] options (path: ${RABBITMQ_URI})`, { namespace: 'RabbitmqClient', RABBITMQ_URI, logPrefix, ...options });

  /*
   * Create instance
   */
  $instances[instanceKey] = await amqplib.connect(RABBITMQ_URI, options)
    .then(client => {
      logger.info(`${logPrefix}RabbitmqClient [setup] starting!`);
      return client;
    })
    .catch(error => {
      logger.error(`${logPrefix}RabbitmqClient [setup] ${error?.message}!`);
    });

  /*
   * Create logger
   */
  $instances[instanceKey]?.on('error', (error) => {
    logger.error(`${logPrefix}RabbitmqClient [error] ${error?.message}!`);
  });

  $instances[instanceKey]?.on('close', (error) => {
    logger.debug(`${logPrefix}RabbitmqClient [close] ${RABBITMQ_URI} - ${error?.message || 'manual'}`, { namespace: 'RabbitmqClient', RABBITMQ_URI });
  });

  return $instances[RABBITMQ_URI];

}
