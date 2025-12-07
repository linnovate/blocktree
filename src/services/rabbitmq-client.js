/**
 * Rabbitmq Client singleton.
 * @function RabbitmqClient
 * @modules [amqplib@^0.10 pino@^10]
 * @envs [RABBITMQ_URI, LOG_SERVICE_NAME]
 * @param {object} { RABBITMQ_URI: 'amqp://[[username][:password]@][host][:port]' } // the rabbitmq service url 
 * @return {promise} the singleton instance
 * @docs https://github.com/amqp-node/amqplib | https://amqp-node.github.io/amqplib/channel_api.html
 * @example
 * --------
 * const rabbitmqClient = await RabbitmqClient({ RABBITMQ_URI: 'amqp://localhost:5672' });
 * const channel = await rabbitmqClient?.createChannel(); 
 * await channel?.assertQueue('queue', { durable: false });
 * channel?.consume('queue', (msg) => console.log(msg?.content.toString()));
 * channel?.sendToQueue('queue', Buffer.from('something to do'));
 * @dockerCompose
  # Rabbitmq service
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

  /*
   * Get instance
   */
  if ($instances[RABBITMQ_URI]) {
    return $instances[RABBITMQ_URI];
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const amqplib = await DynamicImport('amqplib@^0.10');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Options
   */
  if (!RABBITMQ_URI) {
    logger.error(`${logPrefix}RabbitmqClient [missing env]: RABBITMQ_URI`);
    return;
  }
  logger.debug(`${logPrefix}RabbitmqClient [setup] options (path: ${RABBITMQ_URI})`, { namespace: 'RabbitmqClient', RABBITMQ_URI, logPrefix, ...options });

  /*
   * Instance
   */
  $instances[RABBITMQ_URI] = await amqplib.connect(RABBITMQ_URI, options)
    .then(client => {
      logger.info(`${logPrefix}RabbitmqClient [setup] starting!`);
      return client;
    })
    .catch(error => {
      logger.error(`${logPrefix}RabbitmqClient [setup] ${error?.message}!`);
    });

  $instances[RABBITMQ_URI]?.on('error', (error) => {
    logger.error(`${logPrefix}RabbitmqClient [error] ${error?.message}!`);
  });

  $instances[RABBITMQ_URI]?.on('close', (error) => {
    logger.debug(`${logPrefix}RabbitmqClient [close] ${RABBITMQ_URI} - ${error?.message || 'manual'}`, { namespace: 'RabbitmqClient', RABBITMQ_URI });
  });

  return $instances[RABBITMQ_URI];

}
