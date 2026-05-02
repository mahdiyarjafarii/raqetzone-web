import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createBookingController,
  getMyBookingsController,
  cancelBookingController,
  getAdminBookingsController,
  updateBookingStatusController,
} from "../controllers/bookingController.js";

const router = Router();

// User routes
router.post("/bookings", authMiddleware, createBookingController);
router.get("/bookings/my", authMiddleware, getMyBookingsController);
router.patch("/bookings/:id/cancel", authMiddleware, cancelBookingController);

// Admin routes
router.get("/admin/bookings", authMiddleware, getAdminBookingsController);
router.patch("/admin/bookings/:id", authMiddleware, updateBookingStatusController);

export default router;
