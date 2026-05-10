import { Router } from "express";
import { clubOwnerMiddleware } from "../middleware/clubOwnerAuth.js";
import { createUpload } from "../config/multer.js";

const clubImageUpload = createUpload("clubs");
import {
  getMyClubsController,
  createClubController,
  updateClubController,
  deleteClubController,
  getClubCourtsController,
  createClubCourtController,
  updateClubCourtController,
  deleteClubCourtController,
  getClubBookingsController,
  approveClubBookingController,
  rejectClubBookingController,
  getClubStatsController,
  getSlotOverridesController,
  upsertSlotOverrideController,
} from "../controllers/clubPanelController.js";

const router = Router();
router.use(clubOwnerMiddleware);

// Image upload (local storage)
router.post("/club-panel/upload-image", clubImageUpload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "فایلی انتخاب نشده" });
  const url = `/uploads/clubs/${req.file.path.split("/clubs/")[1]}`;
  return res.json({ url });
});

// Dashboard
router.get("/club-panel/stats",                              getClubStatsController);

// Clubs
router.get("/club-panel/clubs",                              getMyClubsController);
router.post("/club-panel/clubs",                             createClubController);
router.patch("/club-panel/clubs/:id",                        updateClubController);
router.delete("/club-panel/clubs/:id",                       deleteClubController);

// Courts (within a club)
router.get("/club-panel/clubs/:clubId/courts",               getClubCourtsController);
router.post("/club-panel/clubs/:clubId/courts",              createClubCourtController);
router.patch("/club-panel/courts/:courtId",                  updateClubCourtController);
router.delete("/club-panel/courts/:courtId",                 deleteClubCourtController);

// Slot overrides
router.get("/club-panel/courts/:courtId/slot-overrides",     getSlotOverridesController);
router.post("/club-panel/courts/:courtId/slot-overrides",    upsertSlotOverrideController);

// Bookings
router.get("/club-panel/bookings",                           getClubBookingsController);
router.patch("/club-panel/bookings/:id/approve",             approveClubBookingController);
router.patch("/club-panel/bookings/:id/reject",              rejectClubBookingController);

export default router;
