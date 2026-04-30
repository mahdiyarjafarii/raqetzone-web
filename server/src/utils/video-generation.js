import { fal } from "@fal-ai/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

import { config } from "../config/env.js";
import { uploadToS3, getContentType } from "./uploadToS3.js";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

fal.config({ credentials: config.falAiApiKey });

async function generateThumbnail(videoPath) {
  try {
    const currentDate = new Date().toISOString().split("T")[0];
    const thumbnailDir = path.join(
      __dirname,
      `../../public/uploads/thumbnails/${currentDate}`
    );

    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    const videoFullPath = path.join(
      __dirname,
      `../../public/uploads/${videoPath}`
    );
    const thumbnailFilename = `thumb-${Date.now()}.jpg`;
    const thumbnailFullPath = path.join(thumbnailDir, thumbnailFilename);

    await execAsync(
      `ffmpeg -i "${videoFullPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbnailFullPath}"`
    );

    return `thumbnails/${currentDate}/${thumbnailFilename}`;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

async function downloadVideo(videoUrl, model) {
  const currentDate = new Date().toISOString().split("T")[0];
  const modelName = model.split("/").pop();
  const filename = `${modelName}-${Date.now()}.mp4`;
  const filePath = `videos/${currentDate}/${filename}`;
  const fullPath = path.join(__dirname, `../../public/uploads/${filePath}`);

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  const response = await fetch(videoUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(fullPath, buffer);

  return filePath;
}

export async function generateVideo({ prompt, config: videoConfig, model, onProgress, imageReference }) {
  const { aspectRatio, duration, resolution } = videoConfig;

  const input = {
    prompt,
    aspect_ratio: aspectRatio,
    duration,
    resolution,
  };

  if (imageReference) input.image_url = imageReference;
  if(process.env.IS_DEV) console.log({input})

  let progress = 30;
  const result = await fal.subscribe(model, {
    input,
    logs: true,
    onQueueUpdate: async (update) => {
      if(process.env.IS_DEV) console.log({ update })
      if (update.status === "IN_PROGRESS" && onProgress) {
        // add 1 to progress
        if(progress < 95) progress += 1;
        await onProgress(progress);
      }
    },
  });

  const videoUrl = result.data.video?.url || result.data.video_url;

  if(process.env.IS_DEV) console.log({videoUrl})
  if (!videoUrl) throw new Error("خطا در دریافت ویدیو از سرور");

  const videoPath = await downloadVideo(videoUrl, model);
  const thumbnailPath = await generateThumbnail(videoPath);

  let videoS3Key = null;
  let videoS3Url = null;
  try {
    const videoFullPath = path.join(__dirname, "../../public/uploads", videoPath);
    const s3VideoPath = `videos/${videoPath.split("/").slice(-2).join("/")}`;
    const videoContentType = getContentType(videoPath);
    const s3VideoResult = await uploadToS3(videoFullPath, s3VideoPath, videoContentType);
    videoS3Key = s3VideoResult.s3Key;
    videoS3Url = s3VideoResult.url;
    fs.unlinkSync(videoFullPath);
  } catch (error) {
    console.error("Error uploading video to S3:", error);
  }

  let thumbnailS3Key = null;
  let thumbnailS3Url = null;
  if (thumbnailPath) {
    try {
      const thumbnailFullPath = path.join(__dirname, "../../public/uploads", thumbnailPath);
      const s3ThumbnailPath = `thumbnails/${thumbnailPath.split("/").slice(-2).join("/")}`;
      const thumbnailContentType = getContentType(thumbnailPath);
      const s3ThumbnailResult = await uploadToS3(thumbnailFullPath, s3ThumbnailPath, thumbnailContentType);
      thumbnailS3Key = s3ThumbnailResult.s3Key;
      thumbnailS3Url = s3ThumbnailResult.url;
      fs.unlinkSync(thumbnailFullPath);
    } catch (error) {
      console.error("Error uploading thumbnail to S3:", error);
    }
  }

  return {
    videoPath,
    thumbnailPath,
    videoS3Key,
    videoS3Url,
    thumbnailS3Key,
    thumbnailS3Url,
  };
}
