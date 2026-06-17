import { S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

export function resetS3Client(): void {
  s3Client = null;
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-south-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
      // AWS SDK v3.600+ defaults to WHEN_SUPPORTED which adds CRC32 checksums to
      // every upload and to presigned PUT URLs. This breaks direct browser→S3 uploads
      // via presigned URLs (extra query params that S3 enforces) and causes hash
      // calculation errors on Node.js Buffer bodies. Use WHEN_REQUIRED to opt out.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return s3Client;
}
