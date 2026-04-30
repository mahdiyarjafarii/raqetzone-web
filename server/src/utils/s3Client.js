import { S3Client } from "@aws-sdk/client-s3";

import { config } from "../config/env.js";

export const s3Client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

export const S3_BUCKET_NAME = config.s3.bucketName;

