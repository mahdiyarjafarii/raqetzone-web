import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createBookingController,
  getMyBookingsController,
  cancelBookingController,
  getAdminBookingsController,
  updateBookingStatusController,
  bookingPaymentCallbackController,
} from "../controllers/bookingController.js";
import { validateDiscountCodeController } from "../controllers/discountController.js";

const router = Router();

// User routes
router.post("/bookings/validate-discount", authMiddleware, validateDiscountCodeController);
router.post("/bookings", authMiddleware, createBookingController);
router.get("/bookings/payment/callback", bookingPaymentCallbackController);
router.get("/bookings/my", authMiddleware, getMyBookingsController);
router.patch("/bookings/:id/cancel", authMiddleware, cancelBookingController);

// Admin routes
router.get("/admin/bookings", authMiddleware, getAdminBookingsController);
router.patch("/admin/bookings/:id", authMiddleware, updateBookingStatusController);

export default router;
