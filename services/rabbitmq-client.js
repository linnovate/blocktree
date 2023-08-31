import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Rabbitmq Client singleton.
 * @function RabbitmqClient
 * @modules [amqplib@^0.10 pino@^8 pino-pretty@^10]
 * @envs [REBBITMQ_URI, LOG_SERVICE_NAME]
 * @param {object} { REBBITMQ_URI: "amqp://[[username][:password]@][host][:port]" } // the rabbitmq service url 
 * @return {promise} the singleton instance
 * @docs https://github.com/amqp-node/amqplib
 * @example const data = await (await RabbitmqClient()).createChannel();
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

let $instance;

export async function RabbitmqClient({ REBBITMQ_URI } = {}) {

  const logger = await Logger();

  if ($instance) {
    return $instance;
  }

  // imports
  const amqplib = await DynamicImport('amqplib@^0.10');

  // envs
  REBBITMQ_URI ??= process.env.REBBITMQ_URI;

  if (!REBBITMQ_URI) {
    logger.error('RabbitmqClient [missing env]: REBBITMQ_URI');
  }

  // instance
  $instance = await amqplib.connect(REBBITMQ_URI, error => {
    if (error) {
      logger.error('RabbitmqClient [error]', { REBBITMQ_URI, error });
    }
  });

  return $instance;

};
