/**
 * Rabbitmq Channel
 * @function RabbitmqChannel
 * @modules [amqplib@^0.10 pino@^10]
 * @envs [RABBITMQ_URI, LOG_SERVICE_NAME]
 * @param {object} options {
 *   RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])
 * }
 * @return {object} channel
 * @example RabbitmqChannel();
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
let instance;

export async function RabbitmqChannel({ logPrefix = '', ...options }) {

  // Get instance
  if (instance) {
    return instance;
  }

  // Create instance
  const { RabbitmqClient } = await import('../services/rabbitmq-client.js');
  const client = await RabbitmqClient({ logPrefix, ...options });
  instance = await client?.createChannel();

  return instance;

}

/**
 * Assert Queue
 * @function AssertQueue
 * @modules [amqplib@^0.10 pino@^10]
 * @envs [RABBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {function} handler
 * @param {object} options {
     RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])
   }
 * @return {bool}
 * @example AssertQueue('update_item', (data) => { console.log(data) });
 */
export async function AssertQueue(queue, handler, { logPrefix = '', ...options } = {}) {

  // Create Queue
  const logger = await (await import('../utils/logger.js')).Logger();
  const channel = await RabbitmqChannel({ logPrefix: 'AssertQueue:', ...options });
  await channel.assertQueue(queue, { durable: false });
  logger.debug(`${logPrefix}AssertQueue [create] ${queue}`, { namespace: 'AssertQueue', queue });

  // Create exchange
  // await channel.assertExchange(exchange, 'direct');
  // channel.bindQueue(queue, exchange, KEY);

  // Create consumer
  await channel.consume(queue, async (message) => {
    // get data
    const data = JSON.parse(message?.content?.toString() || {});

    logger.debug(`${logPrefix}AssertQueue [consume] ${queue} - start!`, { namespace: 'AssertQueue', queue, data, options });

    const isDone = await handler(data)
      ?.catch(error => {
        logger.error(`${logPrefix}AssertQueue [error]: ${queue} - ${error?.message}`);
      });

    logger.debug(`${logPrefix}AssertQueue [consume] ${queue} - end! (isDone: ${!!isDone})`, { namespace: 'AssertQueue', queue, data, options });

    // remove message
    if (isDone !== false) {
      channel.ack(message);
    }
  }, { noAck: false });

  return true;

}

/**
 * Send to queue
 * @function SendToQueue
 * @modules [amqplib@^0.10 pino@^10]
 * @envs [RABBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {object} data
 * @param {object} options {
     RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])
   }
 * @return {bool}
 * @example SendToQueue('update_item', {});
 */
export async function SendToQueue(queue, data, { logPrefix = '', ...options } = {}) {

  const logger = await (await import('../utils/logger.js')).Logger();

  const channel = await RabbitmqChannel({ logPrefix, ...options });
  await channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
  logger.debug(`${logPrefix}SendToQueue [send] ${queue}`, { namespace: 'SendToQueue', queue, data, options });

  return true;

}
