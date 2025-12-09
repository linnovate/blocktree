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
 * @param {Object|null} options - Configuration options for `jwt.verify`. {@link https://www.npmjs.com/package/jsonwebtoken}
 *
 * @returns {Promise<Object|null>} The decoded token payload if successful, or null if verification fails.
 *
 * @example
 * const jwtParsed = await JWTParser(token);
 * console.log( jwtParsed );
 */
export async function JWTParser(token, JWT_SECRET_KEY = process.env.JWT_SECRET_KEY, options) {

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
    logger.error('JWTParser [missing env]: JWT_SECRET_KEY is undefined');
    return;
  }
  logger.debug(`JWTParser [setup] options`, { namespace: 'JWTParser', token, JWT_SECRET_KEY, options });
  
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
    logger.debug(`JWTParser [verify] succeeded!`, { namespace: 'JWTParser', data });
    return data;
  } catch (error) {
    logger.error(`JWTParser [verify] failed! - ${error?.message}`);
    return null;
  }

}
