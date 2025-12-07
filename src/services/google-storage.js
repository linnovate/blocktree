/**
 * Google Storage - Singleton Google Storage Client instance.
 * - Uses default envs: `GOOGLE_STORAGE_CLIENT_EMAIL`, `GOOGLE_STORAGE_PRIVATE_KEY`.
 * - To enable debug logs set env: `DEBUG=blocktree:GoogleStorage` or `DEBUG=blocktree`
 * 
 * @async
 * @function GoogleStorage
 * @requires module:@google-cloud/storage@^7
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object|null} options - Configuration options.
 * @param {string} options.GOOGLE_STORAGE_CLIENT_EMAIL=process.env.GOOGLE_STORAGE_CLIENT_EMAIL - The service account email.
 * @param {string} options.GOOGLE_STORAGE_PRIVATE_KEY=process.env.GOOGLE_STORAGE_PRIVATE_KEY - The private key (raw or base64 encoded).
 * @param {Object|null} ...options - Additional standard `@google-cloud/storage` options. {@link https://www.npmjs.com/package/@google-cloud/storage}
 *
 * @returns {Promise<Object>} The initialized Storage instance.
 *
 * @example
 * const storage = await GoogleStorage();
 * await storage.bucket('my-bucket').upload('./file.txt');
 */

let $instance;

export async function GoogleStorage({
  GOOGLE_STORAGE_CLIENT_EMAIL = process.env.GOOGLE_STORAGE_CLIENT_EMAIL, 
  GOOGLE_STORAGE_PRIVATE_KEY = process.env.GOOGLE_STORAGE_PRIVATE_KEY,
  ...options
} = {}) {

  /*
   * Get instance
   */
  if ($instance) {
    return $instance;
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { Storage } = await DynamicImport('@google-cloud/storage@^7');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Validation
   */
  if (!GOOGLE_STORAGE_CLIENT_EMAIL || !GOOGLE_STORAGE_PRIVATE_KEY) {
    logger.error('GoogleStorage [missing env]: GOOGLE_STORAGE_CLIENT_EMAIL or GOOGLE_STORAGE_PRIVATE_KEY');
  }

  logger.debug(`GoogleStorage [setup] options (client_email: ${GOOGLE_STORAGE_CLIENT_EMAIL})`, { namespace: 'GoogleStorage', GOOGLE_STORAGE_CLIENT_EMAIL, GOOGLE_STORAGE_PRIVATE_KEY, ...options });

  /*
   * Decode base64 key
   */
  let key = GOOGLE_STORAGE_PRIVATE_KEY;
  // Simple check if string is base64 encoded
  if ((Buffer.from(key, 'base64').toString('base64') === key)) {
    key = Buffer.from(key, 'base64').toString('utf8')
  }

  /*
   * Create Instance
   */
  $instance = new Storage({
    credentials: {
      private_key: key,
      client_email: GOOGLE_STORAGE_CLIENT_EMAIL,
    },
    ...options,
  });

  logger.info(`GoogleStorage [setup] initialized!`);
  
  return $instance;

}
