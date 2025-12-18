/**
 * Jwt Session Express - Initializes a reactive session object on the request.
 * - Sets up middleware that hydrates the session from a JWT (found in headers or cookies) and saves changes automatically via a Proxy.
 * - Attaches a reactive Proxy object to `req.jwtSession`.
 *
 * @async
 * @function JwtSessionExpress
 * @requires module:jsonwebtoken@^9
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {Object} app - The express application instance.
 * @param {Object} options - Additional options passed to `JwtSession` function. {@link https://github.com/linnovate/blocktree/blob/v2-dev/docs/utils.md#JwtSession|JwtSession Options Documentation}
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { JwtSessionExpress } from '@linnovate/blocktree';
 * await JwtSessionExpress(app, { JWT_SECRET_KEY: 'secret cat' });
 * app.get('/profile', (req, res) => {
 *   console.log(req.jwtSession.last_visit);
 *   req.jwtSession.last_visit = new Date();
 *   res.send('Session updated');
 * });
 */
export async function JwtSessionExpress(app, options) {

  /*
   * Imports
   */
  const { JwtSession } = await import('../utils/jwt-session.js');
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
      targetLog: req.path,
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
