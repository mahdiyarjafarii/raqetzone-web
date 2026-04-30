import express from "express";
import { uploadImageController } from "../controllers/uploadController.js";
import { authMiddleware } from "../middleware/auth.js";
import { createUpload } from "../config/multer.js";

const router = express.Router();

// Create upload instance for chat images
const chatUpload = createUpload("chat-images");

// Upload image endpoint - requires authentication
router.post(
  "/upload/image",
  authMiddleware,
  chatUpload.single("image"),
  uploadImageController
);

export default router;
