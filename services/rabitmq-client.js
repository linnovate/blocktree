import { Logger } from '../utils/logger.js';

/**
 * Rabitmq Client singleton.
 * @function RabitmqClient
 * @modules amqplib@^0.10
 * @envs REBITMQ_URI
 * @param {object} { REBITMQ_URI: "amqp://test:password@<IP>:5672" }
 * @return {promise} the singleton instance
 * @docs https://github.com/amqp-node/amqplib
 * @example const data = await (await RabitmqClient()).createChannel();
 */

let $instance;

export async function RabitmqClient({ REBITMQ_URI } = {}) {

  const logger = await Logger();

  if ($instance) {
    return $instance;
  }

  // imports
  const amqplib = await import('amqplib').catch(error => {
    logger.error('RabitmqClient [missing module]: amqplib');
  });

  // envs
  REBITMQ_URI ??= process.env.REBITMQ_URI;

  if (!REBITMQ_URI) {
    logger.error('RabitmqClient [missing env]: REBITMQ_URI');
  }

  // instance
  $instance = await amqplib.connect(REBITMQ_URI);

  return $instance;

};
