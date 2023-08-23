import { Logger } from '../utils/logger.js';

/**
 * JWT Parser
 * @function JWTParser
 * @modules [jsonwebtoken@^8 winston@^3]
 * @envs [JWT_SECRET_KEY, LOG_SERVICE_NAME]
 * @param {string} token
 * @param {string} JWT_SECRET_KEY
 * @param {array} algorithms (default: ['RS256'])
 * @return {promise} the jwt parsing
 * @docs https://www.npmjs.com/package/jsonwebtoken
 * @example const data = await JWTParser(token);
 */

export async function JWTParser(token, JWT_SECRET_KEY, algorithms = ['RS256']) {

  const logger = await Logger();

  // imports
  const { default: jwt } = await import('jsonwebtoken').catch(error => {
    logger.error('JWTParser [missing module]: jsonwebtoken');
  });

  // envs
  JWT_SECRET_KEY ??= process.env.JWT_SECRET_KEY;

  if (!JWT_SECRET_KEY) {
    logger.error('JWTParser [missing env]: JWT_SECRET_KEY');
  }

  // decode base64
  let key = JWT_SECRET_KEY;
  if ((Buffer.from(key, 'base64').toString('base64') === key)) {
    key = Buffer.from(key, 'base64').toString('utf8')
  }

  try {
    return jwt.verify(token, key, { algorithms });
  } catch (error) {
    logger.error('JWTParser [verify]', { error });
  }

};
