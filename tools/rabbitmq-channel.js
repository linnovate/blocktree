import { RabitmqClient } from '../services/rabitmq-client.js';
import { Logger } from '../utils/logger.js';

let channel;

/**
 * Assert Queue
 * @function AssertQueue
 * @modules [amqplib@^0.10 pino@^8]
 * @envs [REBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {function} handler
 * @param {object} options { REBITMQ_URI }
 * @return 
 * @example AssertQueue('update_item', (data) => { console.log(data) });
 */
export async function AssertQueue(queue, handler, { REBITMQ_URI } = {}) {

  const logger = await Logger();

  // create channel
  if (!channel) {
    channel = await (await RabitmqClient({ REBITMQ_URI })).createChannel();
    logger.info('AssertQueue - [channel] create', { REBITMQ_URI });
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
 * @modules [amqplib@^0.10 pino@^8]
 * @envs [REBITMQ_URI, LOG_SERVICE_NAME]
 * @param {string} queue
 * @param {object} data
 * @param {object} options { REBITMQ_URI }
 * @return 
 * @example SendToQueue('update_item', {});
 */
export async function SendToQueue(queue, data, { REBITMQ_URI } = {}) {

  const logger = await Logger();

  // create channel
  if (!channel) {
    channel = await (await RabitmqClient({ REBITMQ_URI })).createChannel();
    logger.info('AssertQueue - [channel] create', { REBITMQ_URI });
  }

  await channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));

  logger.info('SendToQueue [send] new queue.', { queue, data });

  return true;

}
