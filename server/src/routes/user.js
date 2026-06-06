import express from "express";

import {
  getCurrentUserController,
  updateProfileController,
  uploadProfileImageController,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/auth.js";
import { createUpload } from "../config/multer.js";

const upload = createUpload("user");

const router = express.Router();

const uploadProfileImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      console.error("Profile image multer error:", {
        message: error.message,
        code: error.code,
        field: error.field,
        contentType: req.headers["content-type"],
        contentLength: req.headers["content-length"],
        userAgent: req.headers["user-agent"],
      });
      return res.status(400).json({ message: error.message || "خطا در آپلود عکس" });
    }

    console.log("Profile image upload received:", {
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      filename: req.file?.filename,
      path: req.file?.path,
      contentType: req.headers["content-type"],
      userAgent: req.headers["user-agent"],
    });

    next();
  });
};

// All user routes require authentication
router.use(authMiddleware);

// User routes
router.get("/users/me", getCurrentUserController);
router.patch("/users/me", updateProfileController);
router.post("/users/upload-image", uploadProfileImage, uploadProfileImageController);
router.post("/users/upload-image/debug-log", (req, res) => {
  console.log("Profile image frontend debug:", {
    userId: req.user?.id,
    body: req.body,
    contentType: req.headers["content-type"],
    userAgent: req.headers["user-agent"],
  });
  return res.json({ ok: true });
});

export default router;

