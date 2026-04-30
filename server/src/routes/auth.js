import express from "express";
import {
  checkUserController,
  sendOTPController,
  verifyOTPController,
} from "../controllers/authController.js";

const router = express.Router();

// Auth routes
router.post("/auth/send-otp", sendOTPController);
router.post("/auth/verify-otp", verifyOTPController);
router.post("/auth/check-user", checkUserController);

export default router;
