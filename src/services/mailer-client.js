/**
 * Mailer Client singleton.
 * @function MailerClient
 * @modules [nodemailer@^7 pino@^10]
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

export async function MailerClient({
  MAILER_HOST = process.env.MAILER_HOST,
  MAILER_USER = process.env.MAILER_USER,
  MAILER_PESS = process.env.MAILER_PESS,
} = {}) {


  if ($instance) {
    return $instance;
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { nodemailer } = await DynamicImport('nodemailer@^7');
  const logger = await (await import('../utils/logger.js')).Logger();

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

  $instance.verify(function (error) {
    if (error) {
      logger.error(`MailerClient verify: ${error}`);
    } else {
      logger.info('MailerClient Server is ready to take our messages');
    }
  });

  return $instance;

};
