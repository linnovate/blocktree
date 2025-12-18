/**
 * Jwt Session - Creates a reactive Proxy object wrapping the JWT data.
 * - Handles token extraction, verification, and creates a proxy that automatically re-signs the JWT and updates the response cookie whenever a property is modified.
 * - Decodes the secret key if base64 encoded.
 * - Selects the token from the Header (`Bearer ...`) or Cookie.
 * - Includes comprehensive logging cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:JwtSession` or `DEBUG=blocktree` or `DEBUG=blocktree:*` to ignore `DEBUG=-blocktree:Server`
 * 
 * @async
 * @function JwtSession
 * @requires module:jsonwebtoken@^9
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} app - The express application instance.
 * @param {Object|null} options - Configuration options.
 * @param {Object} options.headers - The request headers object (used for token extraction).
 * @param {Function} options.setCookie - Function to set cookies (usually `res.cookie`).
 * @param {string} options.JWT_SECRET_KEY=process.env.JWT_SECRET_KEY - The secret key used to sign the token.
 * @param {string|null} options.targetLog - A context identifier for logs (e.g., request URL or function name) to trace execution.
 * @param {string} options.headerKey='authorization' - The header key to look for the token.
 * @param {string} options.cookieKey='token' - The name of the cookie used to store the token.
 * @param {Object|null} options.verifyOptions - Options passed to `jwt.verify`. {@link https://www.npmjs.com/package/jsonwebtoken}
 * @param {Object|null} options.signOptions - Options passed to `jwt.sign`. {@link https://www.npmjs.com/package/jsonwebtoken}
 * @param {Object|null} options.cookieOptions - Additional options passed to `setCookie` (e.g., maxAge, domain).
 *
 * @returns {Promise<Object|boolean>} Returns the Session Proxy object or false on failure.
 *
 * @example
 * import { JwtSession } from '@linnovate/blocktree';
 * const jwtSession = await JwtSession({
 *   headers: {},
 *   setCookie: (...args) => { console.log('setCookie', args) },
 *   JWT_SECRET_KEY: 'secret cat',
 * })
 * jwtSession.time = Date.now();
 */
export async function JwtSession({
  headers,
  setCookie,
  JWT_SECRET_KEY = process.env.JWT_SECRET_KEY,
  targetLog = null,
  headerKey = 'authorization',
  cookieKey = 'token',
  verifyOptions,
  signOptions,
  cookieOptions,
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
  if (!JWT_SECRET_KEY || !headers || !setCookie) {
    logger.error(`jwtSession [missing option]: JWT_SECRET_KEY or headers or setCookie`);
    return false;
  }
  
  // Handle Base64 encoded secret
  if ((Buffer.from(JWT_SECRET_KEY, 'base64').toString('base64') === JWT_SECRET_KEY)) {
    JWT_SECRET_KEY = Buffer.from(JWT_SECRET_KEY, 'base64').toString('utf8')
  }

  /*
   * 1. Extract Token
   */
  let token;
  if (headers[headerKey]?.startsWith('Bearer ')) {
    token = headers[headerKey].split(' ')[1];
  } else {
    token = headers.cookie?.match(`(^| )${cookieKey}=([^;]+)`)?.[2];
  }
  
  /*
   * 2. Verify Token
   */
  let data;
  try {
    data = token && jwt.verify(token, JWT_SECRET_KEY, verifyOptions);
  } catch (error) {
    logger.error(`jwtSession [verify] ${error?.message}! (target: ${targetLog})`);
  }

  const status = !token ? 'no token' : (Object.keys(data).length > 0 ? 'success' : 'failed/empty');
  logger.debug(`jwtSession [verify] ${status}! (target: ${targetLog})`, { namespace: 'jwtSession', data, token, header: headers[headerKey], cookie: headers.cookie });
  
  /*
   * 3. Reactive Proxy
   */
  // This proxy intercepts property setting to auto-sign the JWT
  const dataProxy = new Proxy(data || {}, {
    set: function(target, property, value) {
      target[property] = value;
      try {
        const token = jwt.sign({ ...target }, JWT_SECRET_KEY, signOptions);
        setCookie(cookieKey, token, { httpOnly: true, secure: true, sameSite: 'Lax', ...cookieOptions });
        logger.debug(`JwtSession [set value] (property: ${property}, target: ${targetLog})`, { namespace: 'JwtSession', data: target, token });
      } catch (error) {
        logger.error(`JwtSession [set value] (property: ${property}, target: ${targetLog}) - ${error?.message}!`);
      }
      return true;
    }
  })

  /*
   * Return Proxy obj
   */
  return dataProxy;
  
}
