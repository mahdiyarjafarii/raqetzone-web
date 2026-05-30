import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getMyProfileController,
  updateSportsProfileController,
  getPublicProfileController,
} from "../controllers/profileController.js";

const router = Router();

router.get("/profile/me", authMiddleware, getMyProfileController);
router.patch("/profile/me", authMiddleware, updateSportsProfileController);
router.get("/profile/:userId", authMiddleware, getPublicProfileController);

export default router;
