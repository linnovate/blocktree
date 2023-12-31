import { Logger } from '../utils/logger.js';
import { DynamicImport } from '../utils/dynamic-import.js';

/**
 * Google Storage singleton.
 * @function GoogleStorage
 * @modules [@google-cloud/storage@^7 pino@^8 pino-pretty@^10]
 * @envs [GOOGLE_STORAGE_CLIENT_EMAIL, GOOGLE_STORAGE_PRIVATE_KEY, LOG_SERVICE_NAME]
 * @param {object} { GOOGLE_STORAGE_CLIENT_EMAIL, GOOGLE_STORAGE_PRIVATE_KEY }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/@google-cloud/storage
 * @example const data = await (await GoogleStorage()).bucket({ ... });
 */

let $instance;

export async function GoogleStorage({ GOOGLE_STORAGE_CLIENT_EMAIL, GOOGLE_STORAGE_PRIVATE_KEY } = {}) {

  const logger = await Logger();

  if ($instance) {
    return $instance;
  }

  // imports
  const { Storage } = await DynamicImport('@google-cloud/storage@^7');
  
  // envs
  GOOGLE_STORAGE_CLIENT_EMAIL ??= process.env.GOOGLE_STORAGE_CLIENT_EMAIL;
  GOOGLE_STORAGE_PRIVATE_KEY ??= process.env.GOOGLE_STORAGE_PRIVATE_KEY;

  if (!GOOGLE_STORAGE_CLIENT_EMAIL || !GOOGLE_STORAGE_PRIVATE_KEY) {
    logger.error('GoogleStorage [missing env]: GOOGLE_STORAGE_CLIENT_EMAIL, GOOGLE_STORAGE_PRIVATE_KEY');
  }

  // decode base64
  let key = GOOGLE_STORAGE_PRIVATE_KEY;
  if ((Buffer.from(key, 'base64').toString('base64') === key)) {
    key = Buffer.from(key, 'base64').toString('utf8')
  }

  // instance
  $instance = new Storage({
    credentials: {
      private_key: key,
      client_email: GOOGLE_STORAGE_CLIENT_EMAIL,
    }
  });

  return $instance;

}
