import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

// Created on first use rather than at import: `next build` evaluates route modules while
// collecting page data, and S3Client throws without a region, which fails the whole build.
export function getS3Client(): S3Client {
  if (client) return client;

  const region = process.env.AWS_S3_REGION;
  const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3 is not configured: set AWS_S3_REGION, AWS_S3_ACCESS_KEY_ID and AWS_S3_SECRET_ACCESS_KEY'
    );
  }

  client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return client;
}
