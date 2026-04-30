import express from "express";
import {
  generateImageController,
  getImageHistoryController,
  deleteImageController,
} from "../controllers/imageController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// All image routes require authentication
router.use(authMiddleware);

// Image generation routes
router.post("/images/generate", generateImageController);
router.get("/images/history", getImageHistoryController);
router.delete("/images/:id", deleteImageController);

export default router;

