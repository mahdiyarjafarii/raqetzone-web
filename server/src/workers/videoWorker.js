import { Worker } from "bullmq";
import { eq } from "drizzle-orm";

import redis from "../lib/redis.js";
import { db } from "../db/index.js";
import { videoGenerations, models } from "../db/schema.js";
import { generateVideo } from "../utils/video-generation.js";
import { refundUserCredits } from "../utils/credits/checkUserCredit.js";
import { getVideoPrice } from "../utils/credits/getVideoPrice.js";

// Create video generation worker
const videoWorker = new Worker(
  "video-generation",
  async (job) => {
    const { generationId } = job.data;
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Fetch job data from database
      const [generation] = await db
        .select()
        .from(videoGenerations)
        .where(eq(videoGenerations.id, generationId))
        .limit(1);
      
      if (!generation) {
        throw new Error(`Generation with ID ${generationId} not found`);
      }
      
      // Update status to processing
      await db
        .update(videoGenerations)
        .set({ 
          status: "processing",
          progress: 20,
          updatedAt: new Date()
        })
        .where(eq(videoGenerations.id, generationId));
      
      await job.updateProgress(20);
      
      // Get model details
      const [model] = await db
        .select()
        .from(models)
        .where(eq(models.slug, generation.modelSlug))
        .limit(1);
      
      if (!model) {
        throw new Error(`Model ${generation.modelSlug} not found`);
      }
      
      await job.updateProgress(30);
      
      const updateProgress = async (progressValue) => {
        const cappedProgress = Math.min(95, Math.max(30, progressValue));
        
        await db
          .update(videoGenerations)
          .set({ progress: cappedProgress, updatedAt: new Date() })
          .where(eq(videoGenerations.id, generationId));
        
        await job.updateProgress(cappedProgress);
      };
      
      const generatedVideo = await generateVideo({
        prompt: generation.prompt,
        config: generation.config,
        model: generation.modelSlug,
        onProgress: updateProgress,
        imageReference: generation.imageReference,
      });
      
      // Update database with results
      await db
        .update(videoGenerations)
        .set({
          status: "completed",
          progress: 100,
          videoUrl: generatedVideo.videoUrl,
          videoPath: generatedVideo.videoPath,
          thumbnailPath: generatedVideo.thumbnailPath,
          videoS3Key: generatedVideo.videoS3Key,
          videoS3Url: generatedVideo.videoS3Url,
          thumbnailS3Key: generatedVideo.thumbnailS3Key,
          thumbnailS3Url: generatedVideo.thumbnailS3Url,
          updatedAt: new Date()
        })
        .where(eq(videoGenerations.id, generationId));
      
      await job.updateProgress(100);
      
      return {
        generationId,
        status: "completed",
        videoS3Url: generatedVideo.videoS3Url,
        thumbnailS3Url: generatedVideo.thumbnailS3Url
      };
    } catch (error) {      
      // Get generation data to calculate refund amount
      let refundAmount = 0;
      let shouldRefund = true;
      
      // Check if error is due to content moderation (user fault, not system fault)
      if (error.message && (
        error.message.includes('سیستم نظارت مسدود') || 
        error.message.includes('سیاست‌های محتوایی') ||
        error.message.includes('moderation')
      )) {
        shouldRefund = false;
        // console.log(`🚫 No refund for moderation error: ${error.message}`);
      } else console.error(`❌ Video generation failed for ID: ${generationId}`, error?.body?.detail || error);
      
      if (shouldRefund) {
        try {
          const [generation] = await db
            .select()
            .from(videoGenerations)
            .where(eq(videoGenerations.id, generationId))
            .limit(1);
          
          if (generation) {
            // Calculate the credits that were deducted
            refundAmount = getVideoPrice({
              model: generation.modelSlug,
              duration: generation.config?.duration || 8,
              resolution: generation.config?.resolution || "720p",
            });
            
            // Refund credits to user
            if (refundAmount > 0) {
              const refundResult = await refundUserCredits(generation.userId, refundAmount);
              if (refundResult.success) {
                console.log(`💰 Successfully refunded ${refundAmount} credits to user ${generation.userId}`);
              } else {
                console.error(`❌ Failed to refund credits: ${refundResult.message}`);
              }
            }
          }
        } catch (refundError) {
          console.error("Error during credit refund process:", refundError);
        }
      }
      
      // Update database with error status
      try {
        await db
          .update(videoGenerations)
          .set({
            status: "error",
            progress: 0,
            errorMessage: error.message || "خطای ناشناخته در تولید ویدیو",
            updatedAt: new Date()
          })
          .where(eq(videoGenerations.id, generationId));
      } catch (dbError) {
        console.error("Failed to update database with error status:", dbError);
      }
      
      // Re-throw the error so BullMQ can handle retries
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 20, // Process up to 20 videos simultaneously
    removeOnComplete: 50,
    removeOnFail: 100,
  }
);

// videoWorker.on("ready", () => {
//   console.log("🎬 Video worker is ready and waiting for jobs");
// });

// videoWorker.on("active", (job) => {
//   console.log(`🔄 Processing video generation job ${job.id}`);
// });

// videoWorker.on("failed", (job, err) => {
//   console.error(`❌ Video generation job ${job?.id} failed:`, err.message);
// });

// videoWorker.on("error", (error) => {
//   console.error("❌ Video worker error:", error);
// });

// Graceful shutdown
process.on("SIGINT", async () => {
  // console.log("🛑 Shutting down video worker gracefully...");
  await videoWorker.close();
  await redis.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  // console.log("🛑 Shutting down video worker gracefully...");
  await videoWorker.close();
  await redis.disconnect();
  process.exit(0);
});

export default videoWorker;
