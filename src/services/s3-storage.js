/**
 * S3 Storage singleton.
 * @function S3Storage
 * @modules [@aws-sdk/client-s3@^3 pino@^10]
 * @envs [S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, LOG_SERVICE_NAME]
 * @param {object} { S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY }
 * @return {promise} the singleton instance
 * @docs https://www.npmjs.com/package/@aws-sdk/client-s3
 * @example const data = await (await S3Storage()).send(command);
 */

let $instance;

export async function S3Storage({
  S3_BUCKET = process.env.S3_BUCKET,
  S3_REGION = process.env.S3_REGION,
  S3_ACCESS_KEY = process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY = process.env.S3_SECRET_KEY,
  logPrefix = '',
  ...options
} = {}) {

  /*
   * Get instance
   */
  if ($instance) {
    return $instance;
  }

  /*
   * Imports
   */
  const { DynamicImport } = await import('../utils/dynamic-import.js');
  const { S3Client } = await DynamicImport('@aws-sdk/client-s3@^3');
  const logger = await (await import('../utils/logger.js')).Logger();

  /*
   * Options
   */
  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    logger.error(`${logPrefix}S3Storage [missing env]: S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY`);
    return;
  }
  logger.debug(`${logPrefix}S3Storage [setup] options (path: ${S3_BUCKET})`, { namespace: 'S3Storage', S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY });

  // instance
  $instance = new S3Client({
    bucketName: S3_BUCKET,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
    ...options,
  });

  logger.info(`${logPrefix}S3Storage [setup] starting!`);

  return $instance;

}
