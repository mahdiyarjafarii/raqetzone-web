import express from "express";
import { uploadImageController } from "../controllers/uploadController.js";
import { authMiddleware } from "../middleware/auth.js";
import { createUpload, MAX_UPLOAD_SIZE_MB } from "../config/multer.js";

const router = express.Router();

// Create upload instance for chat images
const chatUpload = createUpload("chat-images");

const uploadChatImage = (req, res, next) => {
  chatUpload.single("image")(req, res, (error) => {
    if (error) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? `حجم عکس نباید بیشتر از ${MAX_UPLOAD_SIZE_MB} مگابایت باشد`
        : error.message || "خطا در آپلود عکس";
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

// Upload image endpoint - requires authentication
router.post(
  "/upload/image",
  authMiddleware,
  uploadChatImage,
  uploadImageController
);

export default router;
