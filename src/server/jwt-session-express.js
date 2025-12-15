/**
 * Jwt Session Express - Creates the Express middleware logic for handling JWT sessions.
 * - Uses default envs: `JWT_SECRET_KEY`, `DEBUG`.
 * - Decodes the secret key if base64 encoded.
 * - Includes comprehensive logging cycles.
 * - To enable debug logs set env: `DEBUG=blocktree:JwtSessionExpress` or `DEBUG=blocktree` or `DEBUG=blocktree:*` to ignore `DEBUG=-blocktree:Server`
 * 
 * @async
 * @function JwtSessionExpress
 * @requires module:jsonwebtoken@^9
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} app - The express application instance.
 * @param {Object|null} options - Configuration options.
 * @param {string} [options.JWT_SECRET_KEY=process.env.JWT_SECRET_KEY] - The secret key used to sign the token.
 * @param {string} [options.headerKey='Authorization'] - The header key to look for the token (e.g., 'Authorization').
 * @param {string} [options.cookieKey='token'] - The name of the cookie used to store the token.
 * @param {string} [options.reqKey='jwtSession'] - The key on the request object where the session data will be attached.
 * @param {Object} [options.verifyOptions] - Options passed to `jwt.verify`. {@link https://www.npmjs.com/package/jsonwebtoken}
 * @param {Object} [options.signOptions] - Options passed to `jwt.sign`. {@link https://www.npmjs.com/package/jsonwebtoken}
 * @param {Object} [options.cookieOptions] - Additional options passed to `res.cookie`.
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { JwtSessionExpress } from '@linnovate/blocktree';
 * await JwtSessionExpress(app, { JWT_SECRET_KEY: 'secret cat' });
 */
export async function JwtSessionExpress(app, {
  JWT_SECRET_KEY = process.env.JWT_SECRET_KEY,
  headerKey = 'Authorization',
  cookieKey = 'token',
  reqKey = 'jwtSession',
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
  if (!JWT_SECRET_KEY) {
    logger.error(`jwtSession [missing env]: JWT_SECRET_KEY`);
    return false;
  }
  
  logger.debug(`jwtSession [setup] options`, { namespace: 'jwtSession', JWT_SECRET_KEY, headerKey, cookieKey, reqKey, verifyOptions, signOptions, cookieOptions });

  // Check if key is base64 encoded and decode it to utf8 if so
  if ((Buffer.from(JWT_SECRET_KEY, 'base64').toString('base64') === JWT_SECRET_KEY)) {
    JWT_SECRET_KEY = Buffer.from(JWT_SECRET_KEY, 'base64').toString('utf8')
  }
  
  /*
   * Middleware Logic
   */
  function handleSession({ path, headers, setCookie, reqObj }) {

    logger.debug(`jwtSession [start] (path: ${path})`, { namespace: 'jwtSession', header: headers[headerKey], cookie: headers.cookie });
   
    let token;
    let data = {}; // Default to empty object ensures Proxy target is valid

    // 1. Extract Token
    if (headers[headerKey]?.startsWith('Bearer ')) {
      token = headers[headerKey].split(' ')[1];
    } else {
      token = headers.cookie?.match(`(^| )${cookieKey}=([^;]+)`)?.[2];
    }

    // 2. Verify Token
    try {
      data = token ? jwt.verify(token, JWT_SECRET_KEY, verifyOptions) : {};
      logger.debug(`jwtSession [verify]`, { namespace: 'jwtSession', data, token });
    } catch (error) {
      logger.error(`jwtSession [verify] ${error?.message}!`);
    }

    // 3. Create Reactive Proxy
    const dataProxy = new Proxy(data, {
      set: function(target, property, value) {
        target[property] = value;
        try {
          const token = jwt.sign(target, JWT_SECRET_KEY, signOptions);
          setCookie(cookieKey, token, { httpOnly: true,  secure: true, sameSite: 'None', ...cookieOptions });
          logger.debug(`JwtSessionExpress [set value]`, { namespace: 'JwtSessionExpress', data: target, token });
        } catch (error) {
          logger.error(`JwtSessionExpress [set value] ${error?.message}!`);
        }
        return true;
      }
    })

    // 4. Attach to Request Object
    Object.defineProperty(reqObj, reqKey, {
      get: () => dataProxy,
      set: (value) => dataProxy[value],
    });
    
    logger.debug(`JwtSessionExpress [end] ${!!data ? 'find data' : 'no data'}! (path: ${path})`, { namespace: 'JwtSessionExpress', data, token });

    return true;
  }

  /*
   * Use Middleware
   */
  app.use(async(req, res, next) => {
    handleSession({
      path: req.path,
      headers: req.headers,
      setCookie: res.cookie.bind(res),
      reqObj: req,
    })
    return next();
  })

  logger.info(`JwtSessionExpress [setup] initialized!`);
  
}
