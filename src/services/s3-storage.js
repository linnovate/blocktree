/**
 * S3 Storage - singleton.
 * - To enable debug logs set env: `DEBUG=blocktree:S3Storage` or `DEBUG=blocktree`
 * 
 * @async
 * @function S3Storage
 * @requires module:@aws-sdk/client-s3@^3
 * @requires module:pino@^10 (Used internally for logging)
 *
 * @param {string} options.S3_BUCKET - The S3 bucket name (validated but not attached to client).
 * @param {string} options.S3_REGION - The AWS region.
 * @param {string} options.S3_ACCESS_KEY - The AWS access key ID.
 * @param {string} options.S3_SECRET_KEY - The AWS secret access key.
 * @param {string} options.logPrefix='' - Optional prefix for log messages.
 * @param {Object|null} ...options - Additional standard `module:@aws-sdk/client-s3` options. {@link https://www.npmjs.com/package/@aws-sdk/client-s3}
 *
 * @returns {Promise<Object>} A promise resolving to the S3Client singleton instance.
 *
 * @example
 * const client = await S3Storage();
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
   * Return Singleton if exists
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
   * Validation
   */
  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    logger.error(`${logPrefix}S3Storage [missing option]: S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY`);
    return;
  }
  logger.debug(`${logPrefix}S3Storage [setup] options (path: ${S3_BUCKET})`, { namespace: 'S3Storage', S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY });

  /*
   * Create instance
   */
  $instance = new S3Client({
    bucketName: S3_BUCKET,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
    ...options,
  });

  logger.info(`${logPrefix}S3Storage [setup] initialized!`);

  return $instance;

}
