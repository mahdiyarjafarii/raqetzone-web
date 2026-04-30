import { fal } from "@fal-ai/client";
import fs from "fs";
import path from "path";

import { uploadToS3, getContentType } from "./uploadToS3.js";

const sizeMap = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

export async function generateImage({ prompt, config: imageConfig, model }) {
  const { aspectRatio, generationCount, style, assetsType } = imageConfig;

  let enhancedPrompt = prompt;
  if (style) enhancedPrompt += `. Style: ${style}.`;
  if (assetsType) enhancedPrompt += ` Format: ${assetsType}.`;

  const imageSize =
    model === "bytedance/seedream/v4/text-to-image"
      ? sizeMap[aspectRatio] ?? sizeMap["1:1"]
      : undefined;

  const result = await fal.subscribe(`fal-ai/${model}`, {
    input: {
      prompt: enhancedPrompt,
      aspect_ratio: aspectRatio,
      num_images: generationCount,
      ...(imageSize ? { image_size: imageSize } : {}),
    },
    logs: true,
  });

  const results = [];
  for (const image of result.data.images) {
    const savedFile = await saveFile(image.url, model);
    results.push(savedFile);
  }

  return results;
}

async function saveFile(imageUrl, model) {
  const currentDate = new Date().toISOString().split("T")[0];
  const modelName = model.split("/").pop();
  const filename = `${modelName}-${Date.now()}.png`;
  const filePath = `images/${currentDate}/${filename}`;
  const fullPath = `./public/uploads/${filePath}`;

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(fullPath, buffer);

  let s3Key = null;
  let s3Url = null;
  try {
    const s3Path = `images/${currentDate}/${filename}`;
    const contentType = getContentType(filename);
    const s3Result = await uploadToS3(fullPath, s3Path, contentType);
    s3Key = s3Result.s3Key;
    s3Url = s3Result.url;
  } catch (error) {
    console.error("Error uploading image to S3:", error);
  } finally {
    fs.unlinkSync(fullPath);
  }

  return { s3Key, s3Url };
}
