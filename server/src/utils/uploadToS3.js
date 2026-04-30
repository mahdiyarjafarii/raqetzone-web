import {
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

import { s3Client, S3_BUCKET_NAME } from "./s3Client.js";

const CACHE_CONTROL = "max-age=604800, public";

/**
 * Upload a file to S3
 * @param {string} filePath - Local file path (relative or absolute)
 * @param {string} s3Key - The key (path) where the file will be stored in S3
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{success: boolean, s3Key: string, url: string}>}
 */
export async function uploadToS3(
  filePath,
  s3Key,
  contentType = "application/octet-stream"
) {
  try {
    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ACL: "public-read",
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate public URL
    const publicUrl = `https://s3.ir-thr-at1.arvanstorage.ir/${S3_BUCKET_NAME}/${s3Key}`;

    return {
      success: true,
      s3Key,
      url: publicUrl,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error(`خطا در آپلود فایل به S3: ${error.message}`);
  }
}

/**
 * Upload a file to S3 with a URL
 * @param {string} fileUrl - URL of the file to download and upload
 * @param {string} s3Key - The key (path) where the file will be stored in S3
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{success: boolean, s3Key: string, url: string}>}
 */
export async function uploadToS3WithUrl(
  fileUrl,
  s3Key,
  contentType = "application/octet-stream"
) {
  try {
    // Download file from URL
    const response = await fetch(fileUrl);
    if (!response.ok)
      throw new Error(`Failed to fetch file from URL: ${response.statusText}`);

    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: Buffer.from(await response.arrayBuffer()),
      ACL: "public-read",
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate public URL
    const publicUrl = `https://s3.ir-thr-at1.arvanstorage.ir/${S3_BUCKET_NAME}/${s3Key}`;

    return {
      success: true,
      s3Key,
      url: publicUrl,
    };
  } catch (error) {
    console.error("Error uploading to S3 from URL:", error);
    throw new Error(`خطا در آپلود فایل به S3: ${error.message}`);
  }
}

/**
 * Delete a file from S3
 * @param {string} s3Key - The key (path) of the file to delete
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteFromS3(s3Key) {
  try {
    if (!s3Key) {
      return { success: false, message: "S3 key is required" };
    }

    const deleteParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting from S3:", error);
    // Don't throw error on delete failure, just log it
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Upload a buffer directly to S3 (useful for generated content)
 * @param {Buffer} buffer - File content as buffer
 * @param {string} s3Key - The key (path) where the file will be stored in S3
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{success: boolean, s3Key: string, url: string}>}
 */
export async function uploadBufferToS3(
  buffer,
  s3Key,
  contentType = "application/octet-stream"
) {
  try {
    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ACL: "public-read",
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate public URL
    const publicUrl = `https://s3.ir-thr-at1.arvanstorage.ir/${S3_BUCKET_NAME}/${s3Key}`;

    return {
      success: true,
      s3Key,
      url: publicUrl,
    };
  } catch (error) {
    console.error("Error uploading buffer to S3:", error);
    throw new Error(`خطا در آپلود فایل به S3: ${error.message}`);
  }
}

/**
 * Upload an entire directory to S3
 * @param {string} localDirectoryPath - Local directory path to upload
 * @param {string} s3DirectoryPath - S3 directory path (prefix) where files will be stored
 * @returns {Promise<{success: boolean, uploadedFiles: Array<{localPath: string, s3Key: string, url: string}>, count: number}>}
 */
export async function uploadDirectory(localDirectoryPath, s3DirectoryPath) {
  try {
    // Ensure s3DirectoryPath ends with /
    const s3Prefix = s3DirectoryPath.endsWith("/")
      ? s3DirectoryPath
      : `${s3DirectoryPath}/`;

    // Check if local directory exists
    const stats = await fs.promises.stat(localDirectoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`${localDirectoryPath} is not a directory`);
    }

    const uploadedFiles = [];

    // Recursive function to read directory and upload files
    async function uploadFilesRecursively(currentPath, s3CurrentPrefix) {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const localPath = path.join(currentPath, entry.name);
        const s3Key = `${s3CurrentPrefix}${entry.name}`;

        if (entry.isDirectory()) {
          // Recursively upload subdirectory
          await uploadFilesRecursively(localPath, `${s3Key}/`);
        } else if (entry.isFile()) {
          // Upload file
          const fileBuffer = await fs.promises.readFile(localPath);
          const contentType = getContentType(entry.name);

          const uploadParams = {
            Bucket: S3_BUCKET_NAME,
            Key: s3Key,
            Body: fileBuffer,
            ACL: "public-read",
            ContentType: contentType,
            CacheControl: CACHE_CONTROL,
          };

          await s3Client.send(new PutObjectCommand(uploadParams));

          const publicUrl = `https://s3.ir-thr-at1.arvanstorage.ir/${S3_BUCKET_NAME}/${s3Key}`;

          uploadedFiles.push({
            localPath,
            s3Key,
            url: publicUrl,
          });
        }

        console.log("Uploaded file:", s3Key);
      }
    }

    await uploadFilesRecursively(localDirectoryPath, s3Prefix);

    return {
      success: true,
      uploadedFiles,
      count: uploadedFiles.length,
    };
  } catch (error) {
    console.error("Error uploading directory to S3:", error);
    throw new Error(`خطا در آپلود دایرکتوری به S3: ${error.message}`);
  }
}


/**
 * Get content type from file extension
 * @param {string} filename - File name with extension
 * @returns {string} - MIME type
 */
export function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".pdf": "application/pdf",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Download all files from an S3 directory to a local directory
 * @param {string} s3DirectoryPath - S3 directory path (prefix)
 * @param {string} localDirectoryPath - Local directory path to save files
 * @returns {Promise<{success: boolean, downloadedFiles: Array<{s3Key: string, localPath: string}>, count: number}>}
 */
export async function downloadDirectory(s3DirectoryPath, localDirectoryPath) {
  try {
    // Ensure s3DirectoryPath ends with /
    const s3Prefix = s3DirectoryPath.endsWith("/")
      ? s3DirectoryPath
      : `${s3DirectoryPath}/`;

    // Create local directory if it doesn't exist
    await fs.promises.mkdir(localDirectoryPath, { recursive: true });

    // List all objects in the S3 directory
    const listParams = {
      Bucket: S3_BUCKET_NAME,
      Prefix: s3Prefix,
      Delimiter: "", // Remove delimiter to get all files recursively
    };

    const listedObjects = await s3Client.send(
      new ListObjectsV2Command(listParams)
    );

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return {
        success: true,
        downloadedFiles: [],
        count: 0,
      };
    }

    const downloadedFiles = [];

    // Download each file
    for (const object of listedObjects.Contents) {
      // Skip if it's a directory marker
      if (object.Key.endsWith("/")) {
        continue;
      }

      // Get relative path from the prefix
      const relativePath = object.Key.substring(s3Prefix.length);
      const localFilePath = path.join(localDirectoryPath, relativePath);

      // Create subdirectories if needed
      const localFileDir = path.dirname(localFilePath);
      await fs.promises.mkdir(localFileDir, { recursive: true });

      // Download the file
      const getParams = {
        Bucket: S3_BUCKET_NAME,
        Key: object.Key,
      };

      const { Body } = await s3Client.send(new GetObjectCommand(getParams));

      // Convert stream to buffer and write to file
      const chunks = [];
      for await (const chunk of Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      await fs.promises.writeFile(localFilePath, buffer);

      downloadedFiles.push({
        s3Key: object.Key,
        localPath: localFilePath,
      });
    }

    return {
      success: true,
      downloadedFiles,
      count: downloadedFiles.length,
    };
  } catch (error) {
    console.error("Error downloading directory from S3:", error);
    throw new Error(`خطا در دانلود پوشه از S3: ${error.message}`);
  }
}

// console.log(await downloadDirectory("videos/showcase/", "temp-upload"));
// console.log(await uploadDirectory("temp-upload/", "videos/showcase/"))