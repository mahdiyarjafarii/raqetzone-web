import { Queue } from "bullmq";

import redis from "../lib/redis.js";

// Create video generation queue
export const videoGenerationQueue = new Queue("video-generation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

// Clean up failed jobs on startup (non-blocking)
videoGenerationQueue.getJobs(["completed"]).then((jobs) => {
  jobs.forEach((job) => job.remove());
}).catch(console.error);

// // Queue event listeners for monitoring
// videoGenerationQueue.on("waiting", (job) => {
//   console.log(`📋 Job ${job.id} is waiting in the queue`);
// });

// videoGenerationQueue.on("active", (job) => {
//   console.log(`🔄 Job ${job.id} has started processing`);
// });

// videoGenerationQueue.on("completed", (job) => {
//   console.log(`✅ Job ${job.id} has completed successfully`);
// });

// videoGenerationQueue.on("failed", (job, err) => {
//   console.error(`❌ Job ${job.id} failed:`, err.message);
// });

// videoGenerationQueue.on("error", (error) => {
//   console.error("❌ Queue error:", error);
// });

export default videoGenerationQueue;
