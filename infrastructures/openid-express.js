import { DynamicImport } from '../utils/dynamic-import.js';
import { Logger } from '../utils/logger.js';

const defaultOptions = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  issuer_url: process.env.ISSUER_URL,
  redirect_uri: process.env.REDIRECT_URI,
  fronted_url: process.env.FRONTED_URL,
  cookieDomain: process.env.DOMAIN
};

/**
 * Open Id Express 
 * @function OpenIdExpress
 * @modules [openid-client@^5]
 * @envs [ISSUER_CLIENT_ID, ISSUER_CLIENT_SECRET, ISSUER_URL, ISSUER_REDIRECT_URI, FRONTED_URL, DOMAIN]
 * @param {object} the express app
 * @param {object} the options {
 *  issuer_url,          // (default: process.env.ISSUER_URL)
 *  client_id,           // (default: process.env.CLIENT_ID)
 *  client_secret,       // (default: process.env.CLIENT_SECRET)
 *  redirect_uri,        // (default: process.env.REDIRECT_URI)
 *  callback(req, res, tokenSet),   // return the tokenSet callback [optional]
 *  fronted_url, // (default: process.env.FRONTED_URL)
 *  cookieDomain,        // (default: process.env.DOMAIN) 
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

  // express routes
  app.get('/auth', async (req, res) => {
    Auth(res, options)
  });

  app.get('/auth/callback', async (req, res) => {
    Callback(req, res, options)
  });
}

/**
 * Auth 
 */
export async function Auth(res, options) {

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

  const { Issuer, generators } = await DynamicImport('openid-client@^5');
  options = Object.assign({}, defaultOptions, options)

  const issuer = await Issuer.discover(options.issuer_url).catch(error => {
    logger.error('OpenIdExpress [Issuer] error:', error);
  });

  if (!issuer) {
    return;
  }

  const client = new issuer.Client({
    client_id: options.client_id,
    client_secret: options.client_secret,
  });

  const url = client.authorizationUrl({
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
export async function Callback(req, res, options) {

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

  const { Issuer } = await DynamicImport('openid-client@^5');
  options = Object.assign({}, defaultOptions, options)

  const issuer = await Issuer.discover(options.issuer_url).catch(error => {
    logger.error('OpenIdExpress [Issuer] error:', error);
  });

  if (!issuer) {
    return;
  }

  const client = new issuer.Client({
    client_id: options.client_id,
    client_secret: options.client_secret,
  });

  const params = client.callbackParams(req);
  const state = params.state;

  if (!state || state !== req.query.state) {
    throw new Error('Invalid state');
  }

  const tokenSet = await client.callback(options.redirect_uri, params, { state });
  if (options.callback) {
    return options.callback(req, res, tokenSet);
  }

  const cookieOptions = {
    secure: true,
    sameSite: 'None',
    maxAge: 20 * 3600000,
  };

  res.cookie('jwt', tokenSet.access_token, cookieOptions);
  res.redirect(options.fronted_url);
};
