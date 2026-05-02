import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getMyProfileController,
  updateSportsProfileController,
} from "../controllers/profileController.js";

const router = Router();

router.get("/profile/me", authMiddleware, getMyProfileController);
router.patch("/profile/me", authMiddleware, updateSportsProfileController);

export default router;
