import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const REGION = process.env.AWS_REGION ?? 'eu-north-1';
const BUCKET = process.env.AWS_S3_BUCKET ?? 'amzn-s3-ontooff-bucket';

export const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload a file buffer to S3 and return the public HTTPS URL.
 * @param buffer   Raw file bytes
 * @param mimeType e.g. "image/jpeg"
 * @param folder   S3 key prefix, e.g. "images/gallery"
 * @param filename Optional filename override (uuid used otherwise)
 */
export async function uploadToS3(
  buffer: Buffer,
  mimeType: string,
  folder: string = 'images',
  filename?: string,
): Promise<string> {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
  const key = `${folder}/${filename ?? randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Objects are publicly readable via bucket policy
    }),
  );

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/**
 * Delete an object from S3 by its full public URL.
 * Silently ignores errors (file may not exist).
 */
export async function deleteFromS3(url: string): Promise<void> {
  try {
    const parsed = new URL(url);
    // key is everything after the leading "/"
    const key = parsed.pathname.replace(/^\//, '');
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // ignore
  }
}
