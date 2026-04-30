import express from "express";
import {
  generateVideoController,
  getVideoStatusController,
  getVideoHistoryController,
  deleteVideoController,
} from "../controllers/videoController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// All video routes require authentication
router.use(authMiddleware);

// Video generation routes
router.post("/videos/generate", generateVideoController);
router.get("/videos/status/:id", getVideoStatusController);
router.get("/videos/history", getVideoHistoryController);
router.delete("/videos/:id", deleteVideoController);

export default router;

