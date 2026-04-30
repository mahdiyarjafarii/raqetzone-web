import { eq, and, desc, like, isNull } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { db } from "../db/index.js";
import { imageGenerations, models } from "../db/schema.js";
import { generateImage } from "../utils/image-generation.js";
import {
  checkUserHasEnoughCredits,
  deductUserCredits,
  refundUserCredits,
} from "../utils/credits/checkUserCredit.js";
import { deleteFromS3 } from "../utils/uploadToS3.js";
import { checkMediaPrompt } from "../utils/checkMediaPrompt.js";
import log from "../utils/logger.js";
import {
  isCachedImagePrompt,
  getCachedImageResponse,
  setCachedImageResponse,
} from "../utils/cachedImagePrompts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate images with AI model
 * POST /api/images/generate
 */
export const generateImageController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `img_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userId = req.user.id;
    const { modelSlug, prompt, config: imageConfig } = req.body;

    console.log(modelSlug, prompt, imageConfig);
    const {
      aspectRatio = "1:1",
      style = "vivid",
      generationCount = 1,
      assetsType,
    } = imageConfig || {};

    // Validate inputs
    if (!modelSlug) {
      const duration = Date.now() - startTime;
      log.error("❌ IMAGE GENERATION FAILED - Missing modelSlug", {
        requestId,
        userId,
        error: "modelSlug missing",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ message: "مدل تصویر الزامی است" });
    }

    if (!prompt || prompt.trim().length < 10) {
      return res
        .status(400)
        .json({ message: "توضیحات باید حداقل ۱۰ کاراکتر باشد" });
    }

    // Validate prompt content for inappropriate material
    const promptValidation = await checkMediaPrompt(prompt.trim());
    if (!promptValidation.isValid) {
      return res.status(400).json({
        message: "محتوای درخواستی مجاز نیست",
        reason: promptValidation.reason,
      });
    }

    // Get model details
    const [model] = await db
      .select()
      .from(models)
      .where(eq(models.slug, modelSlug))
      .limit(1);

    if (!model) return res.status(404).json({ message: "مدل یافت نشد" });
    if (model.type !== "image")
      return res.status(400).json({ message: "این مدل برای تولید تصویر نیست" });

    const creditCheck = await checkUserHasEnoughCredits(userId, modelSlug);
    if (!creditCheck.hasEnough)
      return res.status(400).json({ message: creditCheck.message });

    // Validate assetsType if provided
    if (assetsType && !["logo", "sticker", "poster"].includes(assetsType)) {
      return res.status(400).json({
        message: "نوع دارایی باید یکی از موارد logo، sticker یا poster باشد",
      });
    }

    if (generationCount < 1 || generationCount > 4) {
      return res
        .status(400)
        .json({ message: "تعداد تصاویر باید بین ۱ تا ۴ باشد" });
    }

    // Check if this is a cached image prompt
    const cacheConfig = { aspectRatio, style, generationCount, assetsType };
    const shouldCheckImageCache = isCachedImagePrompt(prompt.trim());

    if (shouldCheckImageCache) {
      const cachedResponse = await getCachedImageResponse(
        prompt.trim(),
        modelSlug,
        cacheConfig
      );

      if (cachedResponse) {
        // Deduct credits for cached response too
        const creditDeduct = await deductUserCredits(
          userId,
          modelSlug,
          creditCheck.requiredCredits
        );
        if (!creditDeduct.success) {
          return res.status(500).json({ message: creditDeduct.message });
        }

        // Save to database with cached images (using s3Url from cache)
        const [savedGeneration] = await db
          .insert(imageGenerations)
          .values({
            userId,
            modelSlug,
            prompt: prompt.trim(),
            config: cacheConfig,
            images: cachedResponse.images.map((img) => ({
              s3Key: img.s3Key,
              s3Url: img.s3Url,
            })),
            errorMessage: null,
            createdAt: new Date(),
          })
          .returning();

        return res.status(201).json({
          generation: {
            id: savedGeneration.id,
            prompt: savedGeneration.prompt,
            config: savedGeneration.config,
            images: savedGeneration.images,
            createdAt: savedGeneration.createdAt,
            remaining: creditDeduct.remainingCredits,
          },
        });
      }
    }

    // Deduct credits before generation (like video)
    const creditDeduct = await deductUserCredits(
      userId,
      modelSlug,
      creditCheck.requiredCredits
    );
    if (!creditDeduct.success) {
      const duration = Date.now() - startTime;
      log.error("❌ IMAGE GENERATION FAILED - Credit deduction error", {
        requestId,
        userId,
        modelSlug,
        error: "credit deduction failed",
        message: creditDeduct.message,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(500).json({ message: creditDeduct.message });
    }

    let generatedImages;
    let errorMessage = null;

    try {
      generatedImages = await generateImage({
        prompt: prompt.trim(),
        config: {
          aspectRatio,
          style,
          generationCount,
          assetsType,
        },
        model: modelSlug,
      });

      // If this is a cached prompt, cache the result
      if (
        shouldCheckImageCache &&
        generatedImages &&
        generatedImages.length > 0
      ) {
        await setCachedImageResponse(
          prompt.trim(),
          modelSlug,
          cacheConfig,
          generatedImages
        );
      }
    } catch (imageError) {
      errorMessage = imageError.message || "خطا در تولید تصویر";
      generatedImages = [];

      log.error("❌ IMAGE GENERATION API ERROR", {
        requestId,
        userId,
        modelSlug,
        error: imageError.message,
        stack: imageError.stack,
        timestamp: new Date().toISOString(),
      });

      // Refund credits if generation failed
      const refundResult = await refundUserCredits(
        userId,
        creditCheck.requiredCredits
      );
      if (refundResult.success) {
        log.info(
          "💰 Successfully refunded credits after image generation failure",
          {
            requestId,
            userId,
            modelSlug,
            refundedAmount: creditCheck.requiredCredits,
            newBalance: refundResult.newBalance,
            timestamp: new Date().toISOString(),
          }
        );
      } else {
        log.error(
          "❌ Failed to refund credits after image generation failure",
          {
            requestId,
            userId,
            modelSlug,
            refundAmount: creditCheck.requiredCredits,
            error: refundResult.message,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    const [savedGeneration] = await db
      .insert(imageGenerations)
      .values({
        userId,
        modelSlug,
        prompt: prompt.trim(),
        config: {
          aspectRatio,
          style,
          generationCount,
          assetsType,
        },
        images: generatedImages,
        errorMessage,
        createdAt: new Date(),
      })
      .returning();

    // If image generation failed, return error (credits already refunded)
    if (errorMessage) {
      const duration = Date.now() - startTime;
      log.error("❌ IMAGE GENERATION FAILED - API Error", {
        requestId,
        userId,
        modelSlug,
        generationId: savedGeneration.id,
        error: errorMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      return res.status(500).json({
        message: errorMessage,
        generation: {
          id: savedGeneration.id,
          prompt: savedGeneration.prompt,
          config: savedGeneration.config,
          errorMessage: savedGeneration.errorMessage,
          createdAt: savedGeneration.createdAt,
        },
      });
    }

    return res.status(201).json({
      generation: {
        id: savedGeneration.id,
        prompt: savedGeneration.prompt,
        config: savedGeneration.config,
        images: savedGeneration.images,
        createdAt: savedGeneration.createdAt,
        remaining: creditDeduct.remainingCredits,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ IMAGE GENERATION FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      modelSlug: req.body?.modelSlug,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res
      .status(500)
      .json({ message: error.message || "خطای سرور در تولید تصویر" });
  }
};

/**
 * Get image generation history
 * GET /api/images/history
 */
export const getImageHistoryController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `hist_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search, modelSlug } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query conditions
    let conditions = [
      eq(imageGenerations.userId, userId),
      isNull(imageGenerations.errorMessage),
    ];

    if (search) conditions.push(like(imageGenerations.prompt, `%${search}%`));
    if (modelSlug) conditions.push(eq(imageGenerations.modelSlug, modelSlug));

    // Get generations with model names
    const generations = await db
      .select({
        ...imageGenerations,
        modelName: models.name,
      })
      .from(imageGenerations)
      .leftJoin(models, eq(imageGenerations.modelSlug, models.slug))
      .where(and(...conditions))
      .orderBy(desc(imageGenerations.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    return res.status(200).json({
      generations,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ IMAGE HISTORY REQUEST FAILED", {
      requestId,
      userId: req.user?.id,
      query: req.query,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Delete an image generation
 * DELETE /api/images/:id
 */
export const deleteImageController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `del_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get generation and verify ownership
    const [generation] = await db
      .select()
      .from(imageGenerations)
      .where(
        and(eq(imageGenerations.id, id), eq(imageGenerations.userId, userId))
      )
      .limit(1);

    if (!generation) {
      const duration = Date.now() - startTime;
      log.error("❌ IMAGE DELETE FAILED - Not found", {
        requestId,
        userId,
        imageId: id,
        error: "generation not found",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "تصویر یافت نشد" });
    }

    // Delete images from S3 and local disk
    if (generation.images && Array.isArray(generation.images)) {
      for (const image of generation.images) {
        // Delete from S3
        if (image.s3Key) {
          try {
            await deleteFromS3(image.s3Key);
          } catch (error) {
            log.warn("⚠️ S3 delete warning", {
              requestId,
              userId,
              imageId: id,
              s3Key: image.s3Key,
              error: error.message,
            });
          }
        }

        // Delete from local disk
        if (
          image.downloadedPath &&
          image.downloadedPath.startsWith("/uploads")
        ) {
          const filepath = path.join(
            __dirname,
            "../../public",
            image.downloadedPath
          );
          if (fs.existsSync(filepath)) {
            try {
              fs.unlinkSync(filepath);
            } catch (error) {
              log.warn("⚠️ Local file delete warning", {
                requestId,
                userId,
                imageId: id,
                filepath,
                error: error.message,
              });
            }
          }
        }
      }
    }

    // Delete from database
    await db.delete(imageGenerations).where(eq(imageGenerations.id, id));

    return res.status(200).json({ message: "تصویر با موفقیت حذف شد" });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ IMAGE DELETE FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      imageId: req.params?.id,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};
