import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Mailer Client singleton.
 * @function MailerClient
 * @modules [nodemailer@^6 pino@^8 pino-pretty@^10]
 * @envs [MAILER_HOST, MAILER_USER, MAILER_PESS, LOG_SERVICE_NAME]
 * @param {object} { MAILER_HOST, MAILER_USER, MAILER_PESS }
 * @return {promise} the singleton instance
 * @docs https://nodemailer.com/about
 * @example const data = await (await MailerClient()).sendMail({
    from,    // sender address
    to,      // list of receivers
    subject, // subject line
    text,    // plain text body
    html,    // html body
  });
 */

let $instance;

export async function MailerClient({ MAILER_HOST, MAILER_USER, MAILER_PESS } = {}) {

  const logger = await Logger();
  
  if ($instance) {
    return $instance;
  }

  const { createClient } = await DynamicImport('nodemailer@^6');
  
  // envs
  MAILER_HOST ??= process.env.MAILER_HOST;
  MAILER_USER ??= process.env.MAILER_USER;
  MAILER_PESS ??= process.env.MAILER_PESS;

  if (!MAILER_HOST || !MAILER_USER || !MAILER_PESS) {
    logger.error('MailerClient [missing env]: MAILER_HOST, MAILER_USER, MAILER_PESS');
  }

  // instance
  $instance = nodemailer.createTransport({
    host: MAILER_HOST,
    port: 465,
    secure: true,
    auth: {
      user: MAILER_USER,
      pass: MAILER_PESS,
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
  });

  $instance.verify(function (error, success) {
    if (error) {
      logger.error(`MailerClient verify: ${error}`);
    } else {
      logger.info('MailerClient Server is ready to take our messages');
    }
  });

  return $instance;

};
