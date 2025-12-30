/**
 * JWT Parser - Verifies and decodes a JWT token.
 * - Uses default envs: `JWT_SECRET_KEY`.
 * - To enable debug logs set env: `DEBUG=blocktree:JWTParser` or `DEBUG=blocktree`
 * 
 * @async
 * @function JWTParser
 * @requires module:jsonwebtoken@^9
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {string} token - The JWT string to verify and parse.
 * @param {string} JWT_SECRET_KEY=process.env.JWT_SECRET_KEY - The secret key used to sign the token.
 * @param {Object|null} options - Configuration options.
 * @param {string|null} options.logPrefix - A string prefix to add to all internal log messages (e.g., `[my-service]`).
 * @param {Object|null} ...options - Configuration options for `jwt.verify`. {@link https://www.npmjs.com/package/jsonwebtoken}
 *
 * @returns {Promise<Object|null>} The decoded token payload if successful, or null if verification fails.
 *
 * @example
 * import { JWTParser } from '@linnovate/blocktree';
 * const jwtParsed = await JWTParser(
 *   ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9','eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0','KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30'].join('.'),
 *   'a-string-secret-at-least-256-bits-long'
 * );
 * console.log('jwtParsed:', jwtParsed);
 */
export async function JWTParser(token, JWT_SECRET_KEY = process.env.JWT_SECRET_KEY, {
  logPrefix = '',
  ...options
} = {}) {

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { default: jwt } = await DynamicImport('jsonwebtoken@^9');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Validation
   */
  if (!JWT_SECRET_KEY) {
    logger.error(`${logPrefix}JWTParser [missing option]: JWT_SECRET_KEY`);
    return;
  }
  logger.debug(`${logPrefix}JWTParser [setup] options`, { namespace: 'JWTParser', token, JWT_SECRET_KEY, options });

  /*
   * Decode base64 key if necessary
   */
  let key = JWT_SECRET_KEY;
  // Check if key is base64 encoded and decode it to utf8 if so
  if ((Buffer.from(key, 'base64').toString('base64') === key)) {
    key = Buffer.from(key, 'base64').toString('utf8')
  }

  /*
   * Verify token
   */
  try {
    const data = jwt.verify(token, key, options);
    logger.debug(`${logPrefix}JWTParser [verify] succeeded!`, { namespace: 'JWTParser', data });
    return data;
  } catch (error) {
    logger.error(`${logPrefix}JWTParser [verify] failed! - ${error?.message}`);
    return null;
  }

}
