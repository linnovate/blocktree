import { RabbitmqClient } from '../services/rabbitmq-client.js';
import { Logger } from '../utils/logger.js';

let channel;

/**
 * Assert Queue
 * @function AssertQueue
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [RABBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {function} handler
 * @param {object} options {
     RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])
   }
 * @return {bool}
 * @example AssertQueue('update_item', (data) => { console.log(data) });
 * @dockerCompose
  # Rabbitmq service
  rabbitmq:
    image: rabbitmq:3.9.29
    environment:
      RABBITMQ_DEFAULT_USER: root
      RABBITMQ_DEFAULT_PASS: root
    ports:
      - 5672:5672
 */
export async function AssertQueue(queue, handler, { RABBITMQ_URI } = {}) {

  const logger = await Logger();

  // create channel
  if (!channel) {
    channel = await (await RabbitmqClient({ RABBITMQ_URI })).createChannel();
    logger.info('AssertQueue - [channel] create', { RABBITMQ_URI });
  }

  // create assert queue
  await channel.assertQueue(queue, { durable: false });

  logger.info('AssertQueue - [assert] new queue.', { queue });

  // create exchange
  // await channel.assertExchange(exchange, 'direct');
  // channel.bindQueue(queue, exchange, KEY);

  // create consumer
  await channel.consume(queue, async (message) => {

    // get data
    const data = JSON.parse(message?.content?.toString() || {});

    // log
    logger.info('AssertQueue [consumer] start.', { queue, data });

    // run handler
    const isDone = await handler(data);

    // log
    logger.info('AssertQueue [consumer] done.', { queue, data });

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
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [RABBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {object} data
 * @param {object} options {
     RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])
   }
 * @return {bool}
 * @example SendToQueue('update_item', {});
 */
export async function SendToQueue(queue, data, { RABBITMQ_URI } = {}) {

  const logger = await Logger();

  // create channel
  if (!channel) {
    channel = await (await RabbitmqClient({ RABBITMQ_URI })).createChannel();
    logger.info('AssertQueue - [channel] create', { RABBITMQ_URI });
  }

  await channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));

  logger.info('SendToQueue [send] new queue.', { queue, data });

  return true;

}

/**
 * Rabbitmq Channel
 * @function RabbitmqChannel
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [RABBITMQ_URI, LOG_SERVICE_NAME]
 * @param {object} options {
     RABBITMQ_URI, // the rabbitmq service url (amqp://[[username][:password]@][host][:port])
   }
 * @return {object} channel
 * @example RabbitmqChannel();
 * @dockerCompose
  # Rabbitmq service
  rabbitmq:
    image: rabbitmq:3.9.29
    environment:
      RABBITMQ_DEFAULT_USER: root
      RABBITMQ_DEFAULT_PASS: root
    ports:
      - 5672:5672
 */
export async function RabbitmqChannel({ RABBITMQ_URI } = {}) {

  const logger = await Logger();

  // create channel
  if (!channel) {
    channel = await (await RabbitmqClient({ RABBITMQ_URI })).createChannel();
    logger.info('AssertQueue - [channel] create', { RABBITMQ_URI });
  }

  return channel;

}
      