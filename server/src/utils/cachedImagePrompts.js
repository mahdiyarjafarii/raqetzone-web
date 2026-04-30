import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getRedisClient, isRedisAvailable } from "../config/redis.js";
import { uploadToS3, getContentType } from "./uploadToS3.js";

/**
 * TTL for cached image prompt responses: 40 hours in seconds
 */
const IMAGE_CACHE_TTL = 40 * 60 * 60; // 40 hours in seconds

/**
 * Directory to store cached images
 */
const CACHE_DIR = "./public/uploads/cached-images";

/**
 * List of image prompts that should be cached
 */
const cachedImagePrompts = [
  "یه عکس انیمه‌ای از رونالدو و امباپه بساز",
];

/**
 * Check if a prompt is in the cached image prompts list
 * @param {string} prompt - The prompt to check
 * @returns {boolean} True if prompt should be cached
 */
export const isCachedImagePrompt = (prompt) => {
  if (!prompt) return false;
  const normalizedPrompt = prompt.trim();
  return cachedImagePrompts.includes(normalizedPrompt);
};

/**
 * Generate a unique cache key for an image prompt with its config
 * @param {string} prompt - The prompt text
 * @param {string} modelSlug - The model used
 * @param {object} config - The image config (aspectRatio, style, generationCount, assetsType)
 * @returns {string} Cache key
 */
export const getImageCacheKey = (prompt, modelSlug, config) => {
  const { aspectRatio = "1:1", style = "vivid", generationCount = 1, assetsType = "" } = config || {};
  
  // Create a unique string from all parameters
  const cacheString = JSON.stringify({
    prompt: prompt.trim(),
    modelSlug,
    aspectRatio,
    style,
    generationCount,
    assetsType: assetsType || "",
  });
  
  // Create a hash for the cache key
  const hash = crypto.createHash("md5").update(cacheString).digest("hex");
  return `image_cache:${hash}`;
};

/**
 * Get cached image response from Redis
 * Reads local cached files and uploads them to S3 with new unique keys
 * to prevent broken images if original user deletes their generation
 * @param {string} prompt - The prompt
 * @param {string} modelSlug - The model used
 * @param {object} config - The image config
 * @returns {Promise<object|null>} Cached response with new S3 keys/URLs or null
 */
export const getCachedImageResponse = async (prompt, modelSlug, config) => {
  try {
    const redis = getRedisClient();

    if (!redis || !(await isRedisAvailable())) {
      return null;
    }

    const cacheKey = getImageCacheKey(prompt, modelSlug, config);
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      
      // Verify that all cached image files still exist locally
      const validImages = [];
      for (const image of parsed.images) {
        if (image.localPath && fs.existsSync(image.localPath)) {
          validImages.push(image);
        }
      }
      
      // If some images are missing locally, invalidate the cache
      if (validImages.length !== parsed.images.length) {
        await redis.del(cacheKey);
        return null;
      }

      // Upload each cached image to S3 with a new unique key
      const uploadedImages = [];
      const currentDate = new Date().toISOString().split("T")[0];
      const modelName = modelSlug.split("/").pop();

      for (let i = 0; i < validImages.length; i++) {
        const image = validImages[i];
        
        try {
          // Generate a unique filename for this new upload
          const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const filename = `cached-${modelName}-${uniqueId}.png`;
          const s3Path = `images/${currentDate}/${filename}`;
          
          // Upload the local cached file to S3 with a new key
          const contentType = getContentType(filename);
          const s3Result = await uploadToS3(image.localPath, s3Path, contentType);
          
          uploadedImages.push({
            s3Key: s3Result.s3Key,
            s3Url: s3Result.url,
          });
        } catch (uploadError) {
          console.error(`❌ Error uploading cached image to S3:`, uploadError.message);
          // If any upload fails, return null to fall back to fresh generation
          return null;
        }
      }

      // Return the cached response with new S3 keys and URLs
      return {
        ...parsed,
        images: uploadedImages,
      };
    }

    return null;
  } catch (error) {
    console.error("❌ Error getting cached image response:", error.message);
    return null;
  }
};

/**
 * Store image response in Redis cache with local file copies
 * @param {string} prompt - The prompt
 * @param {string} modelSlug - The model used
 * @param {object} config - The image config
 * @param {Array} images - Array of image objects with s3Key and s3Url
 * @returns {Promise<Array|null>} Updated images array with local paths or null on failure
 */
export const setCachedImageResponse = async (prompt, modelSlug, config, images) => {
  try {
    const redis = getRedisClient();

    if (!redis || !(await isRedisAvailable())) {
      return null;
    }

    // Ensure cache directory exists
    fs.mkdirSync(CACHE_DIR, { recursive: true });

    const cacheKey = getImageCacheKey(prompt, modelSlug, config);
    const cachedImages = [];

    // Download and save each image locally
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const imageUrl = image.s3Url;
      
      if (!imageUrl) continue;

      try {
        // Generate unique filename based on cache key and index
        const hash = crypto.createHash("md5").update(cacheKey + i).digest("hex");
        const filename = `cached-${hash}.png`;
        const localPath = path.join(CACHE_DIR, filename);
        const publicUrl = `/uploads/cached-images/${filename}`;

        // Download the image
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.error(`Failed to fetch image from ${imageUrl}`);
          continue;
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(localPath, buffer);

        cachedImages.push({
          s3Key: image.s3Key,
          s3Url: image.s3Url,
          localPath,
          publicUrl,
        });
      } catch (downloadError) {
        console.error(`Error downloading image for cache:`, downloadError.message);
      }
    }

    // Only cache if we successfully downloaded all images
    if (cachedImages.length === images.length) {
      const cacheData = {
        prompt: prompt.trim(),
        modelSlug,
        config,
        images: cachedImages,
        cachedAt: new Date().toISOString(),
      };

      await redis.setex(cacheKey, IMAGE_CACHE_TTL, JSON.stringify(cacheData));
      return cachedImages;
    }

    return null;
  } catch (error) {
    console.error("❌ Error caching image response:", error.message);
    return null;
  }
};

export { cachedImagePrompts };
