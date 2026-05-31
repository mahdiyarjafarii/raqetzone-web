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
  getAutoFillOpportunitiesController,
  runAutoFillController,
  getClubCustomersController,
} from "../controllers/clubPanelController.js";
import {
  getDiscountCodesController,
  createDiscountCodeController,
  updateDiscountCodeController,
  deleteDiscountCodeController,
  getDiscountCodeUsagesController,
  sendSmsCampaignController,
  getMarketingSegmentsController,
} from "../controllers/discountController.js";

const router = Router();
router.use("/club-panel", clubOwnerMiddleware);

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

// AutoFill
router.get("/club-panel/autofill/opportunities",             getAutoFillOpportunitiesController);
router.post("/club-panel/autofill/run",                      runAutoFillController);

// Customers
router.get("/club-panel/customers",                          getClubCustomersController);

// Discount codes
router.get("/club-panel/clubs/:clubId/discount-codes",                     getDiscountCodesController);
router.post("/club-panel/clubs/:clubId/discount-codes",                    createDiscountCodeController);
router.patch("/club-panel/clubs/:clubId/discount-codes/:codeId",           updateDiscountCodeController);
router.delete("/club-panel/clubs/:clubId/discount-codes/:codeId",          deleteDiscountCodeController);
router.get("/club-panel/clubs/:clubId/discount-codes/:codeId/usages",      getDiscountCodeUsagesController);
router.post("/club-panel/clubs/:clubId/sms-campaign",                      sendSmsCampaignController);
router.get("/club-panel/clubs/:clubId/marketing-segments",                 getMarketingSegmentsController);

// Bookings
router.get("/club-panel/bookings",                           getClubBookingsController);
router.patch("/club-panel/bookings/:id/approve",             approveClubBookingController);
router.patch("/club-panel/bookings/:id/reject",              rejectClubBookingController);

export default router;
