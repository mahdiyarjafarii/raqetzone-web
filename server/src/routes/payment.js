import express from "express";
import {
  createPaymentController,
  getPaymentsController,
  redirectToCheckoutController,
  callbackController,
} from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Payment routes
router.post("/payment/create", authMiddleware, createPaymentController);
router.get("/payment/redirect/:token", redirectToCheckoutController);
router.post("/payment/callback", callbackController);
router.get("/payment/history", authMiddleware, getPaymentsController);

export default router;
