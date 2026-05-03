import { Router } from "express";
import { adminMiddleware } from "../middleware/adminAuth.js";
import {
  getAdminStatsController,
  getAdminBookingsController,
  getAdminCourtsController,
  createAdminCourtController,
  updateAdminCourtController,
  deleteAdminCourtController,
  approveBookingController,
  rejectBookingController,
  getAdminMatchesController,
  getAdminUsersController,
  getAdminDealsController,
  createAdminDealController,
  deleteAdminDealController,
} from "../controllers/adminAnalyticsController.js";

const router = Router();
router.use(adminMiddleware);

// Analytics
router.get("/admin/stats",               getAdminStatsController);

// Courts
router.get("/admin/courts",              getAdminCourtsController);
router.post("/admin/courts",             createAdminCourtController);
router.patch("/admin/courts/:id",        updateAdminCourtController);
router.delete("/admin/courts/:id",       deleteAdminCourtController);

// Bookings
router.get("/admin/bookings",            getAdminBookingsController);
router.patch("/admin/bookings/:id/approve", approveBookingController);
router.patch("/admin/bookings/:id/reject",  rejectBookingController);

// Matches / Tournaments
router.get("/admin/matches",             getAdminMatchesController);

// Users
router.get("/admin/users",               getAdminUsersController);

// Discounts / Deals
router.get("/admin/deals",               getAdminDealsController);
router.post("/admin/deals",              createAdminDealController);
router.delete("/admin/deals/:id",        deleteAdminDealController);

export default router;
