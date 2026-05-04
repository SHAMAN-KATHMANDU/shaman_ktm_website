// AWS S3 client + presigned PUT helper for the ims-shaman-photos bucket
// (ap-south-1). Used by /api/sysuser/media/sign for direct browser uploads.

import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export function s3Client(): S3Client {
  const accessKeyId = env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
  return new S3Client({
    region: env.S3_REGION,
    // When running on EC2/ECS the SDK's default credential chain picks up the
    // instance role automatically. Only pass explicit creds if both are set.
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
}

export function s3Bucket(): string {
  return env.S3_BUCKET;
}

export function s3PublicUrl(key: string): string {
  const base = env.S3_PUBLIC_BASE.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

export async function presignPut(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: s3Bucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client(), cmd, { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  const cmd = new DeleteObjectCommand({ Bucket: s3Bucket(), Key: key });
  await s3Client().send(cmd);
}
