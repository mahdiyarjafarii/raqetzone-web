import { eq, and, desc, like, inArray } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { db } from "../db/index.js";
import { videoGenerations, models } from "../db/schema.js";
import { videoGenerationQueue } from "../queues/videoQueue.js";
import {
  checkUserHasEnoughCredits,
  deductUserCredits,
} from "../utils/credits/checkUserCredit.js";
import { deleteFromS3 } from "../utils/uploadToS3.js";
import { checkMediaPrompt } from "../utils/checkMediaPrompt.js";
import { validateImageReference } from "../utils/imageValidation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate video with AI model (Async with Queue)
 * POST /api/videos/generate
 */
export const generateVideoController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelSlug, prompt, config: videoConfig, imageReference } = req.body;

    // Validate inputs
    if (!modelSlug) return res.status(400).json({ message: "مدل ویدیو الزامی است" });

    if (!prompt || prompt.trim().length < 10) {
      return res
        .status(400)
        .json({ message: "توضیحات باید حداقل ۱۰ کاراکتر باشد" });
    }

    if (prompt.trim().length > 2000) {
      return res
        .status(400)
        .json({ message: "توضیحات نباید بیشتر از ۲۰۰۰ کاراکتر باشد" });
    }

    // Validate prompt content for inappropriate material
    const promptValidation = await checkMediaPrompt(prompt.trim());
    if (!promptValidation.isValid) {
      return res.status(400).json({ 
        message: "محتوای درخواستی مجاز نیست",
        reason: promptValidation.reason 
      });
    }

    // Get model details
    const [model] = await db
      .select()
      .from(models)
      .where(eq(models.slug, modelSlug))
      .limit(1);

    if (!model) {
      return res.status(404).json({ message: "مدل یافت نشد" });
    }

    if (model.type !== "video") {
      return res.status(400).json({ message: "این مدل برای تولید ویدیو نیست" });
    }

    // Validate config - parse if it's a string
    let parsedConfig = videoConfig;
    if (typeof videoConfig === 'string') {
      try {
        parsedConfig = JSON.parse(videoConfig);
      } catch (error) {
        return res.status(400).json({ message: "فرمت config نامعتبر است" });
      }
    }
    
    const {
      resolution,
      aspectRatio,
      duration,
    } = parsedConfig || {};
    
    // Set defaults only if values are not provided
    const finalResolution = resolution || "720p";
    const finalAspectRatio = aspectRatio || "16:9";
    const finalDuration = duration || 4;

    const creditCheck = await checkUserHasEnoughCredits(
      userId,
      modelSlug,
      parsedConfig
    );
    if (!creditCheck.hasEnough)
      return res.status(400).json({ message: creditCheck.message });

    // Validate resolution
    if (!["480p", "720p", "1080p"].includes(finalResolution)) {
      return res.status(400).json({ message: "رزولوشن نامعتبر است" });
    }

    // Validate aspect ratio
    if (!["16:9", "9:16"].includes(finalAspectRatio)) {
      return res.status(400).json({ message: "نسبت تصویر نامعتبر است" });
    }

    // Validate duration
    if (![4, 5, 6, 8, 10, 12].includes(finalDuration)) {
      return res
        .status(400)
        .json({ message: "مدت زمان باید ۴، ۵، ۶، ۸، ۱۰ یا ۱۲ ثانیه باشد" });
    }

    // Validate image reference if provided
    if (imageReference) {
      // Check if it's a valid URL or file path
      if (typeof imageReference !== 'string' || imageReference.trim().length === 0) {
        return res.status(400).json({ message: "فرمت تصویر مرجع نامعتبر است" });
      }
      
      // Validate image reference format and compatibility
      const imageValidation = await validateImageReference(imageReference.trim(), {
        aspectRatio: finalAspectRatio,
        resolution: finalResolution
      });
      
      if (!imageValidation.isValid) {
        return res.status(400).json({ 
          message: imageValidation.message,
          help: `تصویر مرجع باید با رزولوشن ویدیو مطابقت داشته باشد و در فرمت JPEG، PNG یا WebP باشد.`
        });
      }
    }

    // Insert DB record with queued status
    const [savedGeneration] = await db
      .insert(videoGenerations)
      .values({
        userId,
        modelSlug,
        prompt: prompt.trim(),
        config: {
          resolution: finalResolution,
          aspectRatio: finalAspectRatio,
          duration: finalDuration,
        },
        imageReference: imageReference ? imageReference.trim() : null,
        status: "queued",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Deduct credits upfront
    const creditDeduct = await deductUserCredits(
      userId,
      modelSlug,
      creditCheck.requiredCredits
    );
    if (!creditDeduct.success) {
      // If credit deduction fails, delete the generation record
      await db.delete(videoGenerations).where(eq(videoGenerations.id, savedGeneration.id));
      return res.status(500).json({ message: creditDeduct.message });
    }

    // Add job to BullMQ queue
    await videoGenerationQueue.add("generate", {
      generationId: savedGeneration.id
    });

    // Return immediately with generation ID
    return res.status(201).json({
      id: savedGeneration.id,
      status: "queued",
      message: "ویدیو در صف تولید قرار گرفت",
      remaining: creditDeduct.remainingCredits,
    });
  } catch (error) {
    console.error("Generate video error:", error);
    return res
      .status(500)
      .json({ message: error.message || "خطای سرور در تولید ویدیو" });
  }
};

/**
 * Get video generation status
 * GET /api/videos/status/:id
 */
export const getVideoStatusController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get generation and verify ownership
    const [generation] = await db
      .select()
      .from(videoGenerations)
      .where(
        and(eq(videoGenerations.id, id), eq(videoGenerations.userId, userId))
      )
      .limit(1);

    if (!generation) return res.status(404).json({ message: "ویدیو یافت نشد" });

    // Return status information based on generation status
    const baseResponse = {
      id: generation.id,
      status: generation.status,
      progress: generation.progress || 0,
      createdAt: generation.createdAt,
      updatedAt: generation.updatedAt,
    };

    // If queued or processing, return minimal info
    if (generation.status === "queued" || generation.status === "processing") {
      return res.status(200).json(baseResponse);
    }

    // If completed, return full info
    if (generation.status === "completed") {
      return res.status(200).json({
        ...baseResponse,
        videoUrl: generation.videoS3Url || generation.videoUrl,
        thumbnailUrl: generation.thumbnailS3Url,
        prompt: generation.prompt,
        config: generation.config,
        modelSlug: generation.modelSlug,
        imageReference: generation.imageReference,
      });
    }

    // If error, return error info
    if (generation.status === "error") {
      return res.status(500).json({
        ...baseResponse,
        errorMessage: generation.errorMessage,
        prompt: generation.prompt,
        config: generation.config,
        modelSlug: generation.modelSlug,
        imageReference: generation.imageReference,
      });
    }

    // Default fallback (shouldn't reach here)
    return res.status(200).json(baseResponse);
  } catch (error) {
    console.error("Get video status error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Get video generation history
 * GET /api/videos/history
 */
export const getVideoHistoryController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search, modelSlug } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query conditions
    let conditions = [
      eq(videoGenerations.userId, userId),
      inArray(videoGenerations.status, ["completed", "processing"])
    ];

    if (search) {
      conditions.push(like(videoGenerations.prompt, `%${search}%`));
    }

    if (modelSlug) {
      conditions.push(eq(videoGenerations.modelSlug, modelSlug));
    }

    // Get generations with model names
    const generations = await db
      .select({
        ...videoGenerations,
        modelName: models.name,
      })
      .from(videoGenerations)
      .leftJoin(models, eq(videoGenerations.modelSlug, models.slug))
      .where(and(...conditions))
      .orderBy(desc(videoGenerations.createdAt))
      .limit(parseInt(limit))
      .offset(offset);


    return res.status(200).json({
      generations,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get video history error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Delete a video generation
 * DELETE /api/videos/:id
 */
export const deleteVideoController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get generation and verify ownership
    const [generation] = await db
      .select()
      .from(videoGenerations)
      .where(
        and(eq(videoGenerations.id, id), eq(videoGenerations.userId, userId))
      )
      .limit(1);

    if (!generation) {
      return res.status(404).json({ message: "ویدیو یافت نشد" });
    }

    // Delete video from S3
    if (generation.videoS3Key) {
      try {
        await deleteFromS3(generation.videoS3Key);
      } catch (error) {
        console.error("Error deleting video from S3:", error);
      }
    }

    // Delete thumbnail from S3
    if (generation.thumbnailS3Key) {
      try {
        await deleteFromS3(generation.thumbnailS3Key);
      } catch (error) {
        console.error("Error deleting thumbnail from S3:", error);
      }
    }

    // Delete video file from disk
    if (generation.videoPath) {
      const videoFilepath = path.join(
        __dirname,
        "../../public/uploads",
        generation.videoPath
      );
      if (fs.existsSync(videoFilepath)) {
        try {
          fs.unlinkSync(videoFilepath);
        } catch (error) {
          console.error("Error deleting video file:", error);
        }
      }
    }

    // Delete thumbnail file from disk
    if (generation.thumbnailPath) {
      const thumbnailFilepath = path.join(
        __dirname,
        "../../public/uploads",
        generation.thumbnailPath
      );
      if (fs.existsSync(thumbnailFilepath)) {
        try {
          fs.unlinkSync(thumbnailFilepath);
        } catch (error) {
          console.error("Error deleting thumbnail file:", error);
        }
      }
    }

    // Delete from database
    await db.delete(videoGenerations).where(eq(videoGenerations.id, id));

    return res.status(200).json({ message: "ویدیو با موفقیت حذف شد" });
  } catch (error) {
    console.error("Delete video error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
