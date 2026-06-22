import express from "express";
import {
  checkUserController,
  sendOTPController,
  verifyOTPController,
  loginWithPasswordController,
  setPasswordController,
  resetPasswordController,
} from "../controllers/authController.js";
import { clubOwnerMiddleware } from "../middleware/clubOwnerAuth.js";

const router = express.Router();

// Auth routes
router.post("/auth/send-otp", sendOTPController);
router.post("/auth/verify-otp", verifyOTPController);
router.post("/auth/check-user", checkUserController);

// Password-based auth for club owners
router.post("/auth/login-password", loginWithPasswordController);
router.post("/auth/set-password", clubOwnerMiddleware, setPasswordController);
router.post("/auth/reset-password", resetPasswordController);

export default router;
