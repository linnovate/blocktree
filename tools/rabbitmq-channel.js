import { RabitmqClient } from '../services/rabitmq-client.js';
import { Logger } from '../utils/logger.js';

let channel;

/**
 * Assert Queue
 * @function AssertQueue
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [REBBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {function} handler
 * @param {object} options { REBBITMQ_URI: "amqp://[[username][:password]@][host][:port]" }
 * @return 
 * @example AssertQueue('update_item', (data) => { console.log(data) });
 * @dockerCompose
  # Rabbitmq service
  rabbitmq:
    image: rabbitmq:alpine
    environment:
      RABBITMQ_DEFAULT_USER: root
      RABBITMQ_DEFAULT_PASS: root
    ports:
      - 5672:5672
 */
export async function AssertQueue(queue, handler, { REBBITMQ_URI } = {}) {

  const logger = await Logger();

  // create channel
  if (!channel) {
    channel = await (await RabitmqClient({ REBBITMQ_URI })).createChannel();
    logger.info('AssertQueue - [channel] create', { REBBITMQ_URI });
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
    await handler(data);

    // log
    logger.info('AssertQueue [consumer] done.', { queue, data });

    // remove message
    // channel.ack(message)

  }, { noAck: false });

  return true;

}

/**
 * Send to queue
 * @function SendToQueue
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [REBBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {object} data
 * @param {object} options { REBBITMQ_URI: "amqp://[[username][:password]@][host][:port]" }
 * @return 
 * @example SendToQueue('update_item', {});
 */
export async function SendToQueue(queue, data, { REBBITMQ_URI } = {}) {

  const logger = await Logger();

  // create channel
  if (!channel) {
    channel = await (await RabitmqClient({ REBBITMQ_URI })).createChannel();
    logger.info('AssertQueue - [channel] create', { REBBITMQ_URI });
  }

  await channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));

  logger.info('SendToQueue [send] new queue.', { queue, data });

  return true;

}
