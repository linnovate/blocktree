import { DynamicImport } from '../utils/dynamic-import.js';
import { Logger } from '../utils/logger.js';

const defaultOptions = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  issuer_url: process.env.ISSUER_URL,
  redirect_uri: process.env.REDIRECT_URI,
  website_url: process.env.WEBSITE_URL || "/",
  cookieOptions: {},
};

/**
 * Open Id Express 
 * @function OpenIdExpress
 * @modules [openid-client@^5]
 * @envs [ISSUER_CLIENT_ID, ISSUER_CLIENT_SECRET, ISSUER_URL, ISSUER_REDIRECT_URI, WEBSITE_URL]
 * @param {object} the express app
 * @param {object} the options {
 *  issuer_url,          // (default: process.env.ISSUER_URL)
 *  client_id,           // (default: process.env.CLIENT_ID)
 *  client_secret,       // (default: process.env.CLIENT_SECRET)
 *  redirect_uri,        // (default: process.env.REDIRECT_URI)
 *  callback(req, res, tokenSet),   // return the tokenSet callback [optional]
 *  website_url,         // (default: process.env.WEBSITE_URL || "/" )
 *  cookieOptions,       // (default: { secure: true, sameSite: 'None', maxAge: 20 * 3600000 }) 
 * }
 * @return {promise} 
 * @example OpenIdExpress(app, options);
 * @docs https://www.npmjs.com/package/openid-client
*/

export async function OpenIdExpress(app, options) {

  const logger = await Logger();

  options = Object.assign({}, defaultOptions, options)

  // validations erros
  if (!options.issuer_url) {
    logger.error('OpenIdExpress [missing env]: options.issuer_url || ISSUER_URL');
  }
  if (!options.client_id) {
    logger.error('OpenIdExpress [missing env]: options.client_id || CLIENT_ID');
  }
  if (!options.client_secret) {
    logger.error('OpenIdExpress [missing env]: options.client_secret || CLIENT_SECRET');
  }
  if (!options.redirect_uri) {
    logger.error('OpenIdExpress [missing env]: options.redirect_uri || REDIRECT_URI');
  }

  // issuer setup
  const { Issuer } = await DynamicImport('openid-client@^5');

  const issuer = await Issuer.discover(options.issuer_url).catch(error => {
    logger.error('OpenIdExpress [Issuer] error:', error);
  });

  if (!issuer) {
    return;
  }

  const issuerClient = new issuer.Client({
    client_id: options.client_id,
    client_secret: options.client_secret,
  });


  // express routes
  app.get('/auth', async (req, res) => {
    Auth(res, issuerClient, options)
  });

  app.get('/auth/callback', async (req, res) => {
    Callback(req, res, issuerClient, options)
  });

  app.get('/auth/refresh', async (req, res) => {
    RefreshToken(req, res, issuerClient, options)
  });

}

/**
 * Auth 
 */
async function Auth(res, issuerClient, options) {

  const { generators } = await DynamicImport('openid-client@^5');

  const url = issuerClient.authorizationUrl({
    scope: 'openid',
    response_type: 'code',
    redirect_uri: options.redirect_uri,
    state: generators.state(),
  });

  res.redirect(url);

  return true;
};

/**
 * Callback 
 */
async function Callback(req, res, issuerClient, options) {

  if (typeof req.cookies === 'undefined') {
    logger.error('OpenIdExpress [Callback] It appears cookie-parser middleware hasn\'t been applied. Please ensure to use cookie-parser before this middleware.');
    return res.state(400).json({ message: 'cookies are missing' });
  }

  const params = issuerClient.callbackParams(req);
  const state = params.state;

  if (!state || state !== req.query.state) {
    return res.state(400).json({ message: 'invalid state' });
  }

  const tokenSet = await issuerClient.callback(options.redirect_uri, params, { state });

  if (options.callback) {
    return options.callback(req, res, tokenSet);
  }

  const cookieOptions = {
    secure: true,
    sameSite: 'None',
    maxAge: 20 * 3600000,
    ...options.cookieOptions
  };

  res.cookie('jwt', tokenSet.access_token, cookieOptions);
  res.cookie('refresh_token', tokenSet.refresh_token, cookieOptions);

  res.redirect(options.website_url);

};

/**
 * RefreshToken 
 */
async function RefreshToken(req, res, issuerClient, options) {

  if (typeof req.cookies === 'undefined') {
    logger.error('OpenIdExpress [Callback] It appears cookie-parser middleware hasn\'t been applied. Please ensure to use cookie-parser before this middleware.');
    return res.state(400).json({ message: 'cookies are missing.' });
  }

  const logger = await Logger();

  const refreshToken = req.cookies['refresh_token'];

  if (!refreshToken) {
    return res.status(401).json({});
  }

  const newToken = await issuerClient.refresh(refreshToken)
    .catch((error) => {
      logger.error('OpenIdExpress [RefreshToken] error:', error);
    })

  if (!newToken) {
    return res.status(401).json({});
  }

  const cookieOptions = {
    secure: true,
    sameSite: 'None',
    maxAge: 20 * 3600000,
    ...options.cookieOptions
  };

  res.cookie('jwt', newToken.access_token, cookieOptions);
  res.cookie('refresh_token', newToken.refresh_token, cookieOptions);

  return res.status(200).json({ message: 'ok' });
}
