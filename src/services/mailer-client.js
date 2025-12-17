/**
 * Mailer Client - Singleton Nodemailer instance.
 * - Uses default envs: `MAILER_HOST`, `MAILER_USER`, `MAILER_PESS`.
 * - To enable debug logs set env: `DEBUG=blocktree`
 * 
 * @async
 * @function MailerClient
 * @requires module:nodemailer@^7
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} options - Configuration options.
 * @param {Object|null} ...options - Additional standard `module:nodemailer` options. {@link https://nodemailer.com/about}
 *
 * @returns {Promise<Object>} The initialized instance.
 *
 * @example
 * const storage = await MailerClient();
 * await storage.bucket('my-bucket').upload('./file.txt');
 */
let $instance;

export async function MailerClient({
  MAILER_HOST = process.env.MAILER_HOST,
  MAILER_USER = process.env.MAILER_USER,
  MAILER_PESS = process.env.MAILER_PESS,
} = {}) {

  /**
   * Return Singleton if exists
   */
  if ($instance) {
    return $instance;
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { nodemailer } = await DynamicImport('nodemailer@^7');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Validation
   */
  if (!MAILER_HOST || !MAILER_USER || !MAILER_PESS) {
    logger.error('MailerClient [missing option]: MAILER_HOST, MAILER_USER, MAILER_PESS');
  }

  /*
   * Create Instance
   */
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

}
