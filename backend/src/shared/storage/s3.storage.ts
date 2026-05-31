import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '@/config/s3';
import { SIGNED_URL_EXPIRY_SECONDS } from '@/config/constants';

export enum S3Category {
  EMPLOYEE_DOCUMENTS = 'documents/employees',
  PAYSLIPS = 'payslips',
  REPORTS = 'reports',
  IMPORTS = 'imports',
  EXPORTS = 'exports',
  TEMPLATES = 'templates',
  PROFILE_IMAGES = 'profile-images',
}

export interface PresignUploadParams {
  s3Key: string;
  mimeType: string;
  maxSizeBytes?: number;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  s3Key: string;
  expiresAt: Date;
}

export class S3Storage {
  private readonly bucket: string;

  constructor(bucket?: string) {
    this.bucket = bucket ?? process.env.AWS_S3_BUCKET ?? '';
  }

  buildS3Key(tenantPublicId: string, category: S3Category, ...segments: string[]): string {
    const parts = ['tenants', tenantPublicId, category, ...segments].filter(Boolean);
    return parts.join('/');
  }

  async generatePresignedUploadUrl(params: PresignUploadParams): Promise<PresignedUploadResult> {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.s3Key,
      ContentType: params.mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    });

    return {
      uploadUrl,
      s3Key: params.s3Key,
      expiresAt: new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000),
    };
  }

  async generatePresignedDownloadUrl(
    s3Key: string,
    expiresIn = SIGNED_URL_EXPIRY_SECONDS,
  ): Promise<string> {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });
    return getSignedUrl(client, command, { expiresIn });
  }

  async deleteObject(s3Key: string): Promise<void> {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }),
    );
  }

  async objectExists(s3Key: string): Promise<boolean> {
    const client = getS3Client();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      );
      return true;
    } catch {
      return false;
    }
  }
}

export const s3Storage = new S3Storage();
