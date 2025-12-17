/**
 * Jwt Session Express - Initializes a reactive session object on the request.
 * - Sets up middleware that hydrates the session from a JWT and saves changes automatically via a Proxy.
 *
 * @async
 * @function JwtSessionExpress
 * @requires module:jsonwebtoken@^9
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} app - The express application instance.
 * @param {Object} options - Additional options passed to `JwtSession` function.
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { JwtSessionExpress } from '@linnovate/blocktree';
 * await JwtSessionExpress(app, { JWT_SECRET_KEY: 'secret cat' });
 */
export async function JwtSessionExpress(app, options) {

  const logger = await (await import('../utils/logger.js')).Logger();

  logger.debug(`JwtSession [setup] options`, { namespace: 'JwtSession', ...options });
  
  /*
   * Use Middleware
   */
  app.use(async(req, res, next) => {

    // Pass headers and cookie setter to the core logic
    const dataProxy = await JwtSession({
      headers: req.headers,
      setCookie: res.cookie.bind(res),
      ...options
    })

    // Attach the proxy to the request object
    Object.defineProperty(req, 'jwtSession', {
      get: () => dataProxy,
      set: (value) => {
        if (typeof value === 'object') {
          return Object.assign(dataProxy, value);
        }
        return dataProxy[value];
      },
    });
    
    return next();
  })

  logger.info(`JwtSession [setup] initialized!`);
  
}


/**
 * Jwt Session - Creates a Proxy object wrapping the JWT data, automatically triggers a JWT re-sign and updates the response cookie on property modification.
 * - Uses default envs: `JWT_SECRET_KEY`, `DEBUG`.
 * - Decodes the secret key if base64 encoded.
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
 * @param {Object} options.headers - The request headers object (used for token extraction and CSRF).
 * @param {Function} options.setCookie - Function to set cookies (usually `res.cookie`).
 * @param {string} options.JWT_SECRET_KEY=process.env.JWT_SECRET_KEY - The secret key used to sign the token.
 * @param {string} options.headerKey='authorization' - The header key to look for the token.
 * @param {string} options.cookieKey='token' - The name of the cookie used to store the token.
 * @param {Object} options.verifyOptions - Options passed to `jwt.verify`. {@link https://www.npmjs.com/package/jsonwebtoken}
 * @param {Object} options.signOptions - Options passed to `jwt.sign`. {@link https://www.npmjs.com/package/jsonwebtoken}
 * @param {Object} options.cookieOptions - Additional options passed to `setCookie` (e.g., maxAge, domain).
 *
 * @returns {Promise<Object|boolean>} Returns the Session Proxy object or false on failure.
 *
 * @example
 * import { JwtSession } from '@linnovate/blocktree';
 * const jwtSession = JwtSession({ headers: req.headers, setCookie: req.cookie, JWT_SECRET_KEY: 'secret cat' })
 */
export async function JwtSession({
  headers,
  setCookie,
  JWT_SECRET_KEY = process.env.JWT_SECRET_KEY,
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
    logger.error(`jwtSession [verify] ${error?.message}!`);
  }

  const status = !token ? 'no token' : (Object.keys(data).length > 0 ? 'success' : 'failed/empty');
  logger.debug(`jwtSession [verify] ${status}!`, { namespace: 'jwtSession', data, token, header: headers[headerKey], cookie: headers.cookie });
  
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
        logger.debug(`JwtSession [set value] (property: ${property})`, { namespace: 'JwtSession', data: target, token });
      } catch (error) {
        logger.error(`JwtSession [set value] (property: ${property}) - ${error?.message}!`);
      }
      return true;
    }
  })

  /*
   * Return Proxy obj
   */
  return dataProxy;
  
}
