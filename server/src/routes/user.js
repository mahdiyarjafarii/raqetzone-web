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

// All user routes require authentication
router.use(authMiddleware);

// User routes
router.get("/users/me", getCurrentUserController);
router.patch("/users/me", updateProfileController);
router.post("/users/upload-image", upload.single("image"), uploadProfileImageController);

export default router;

