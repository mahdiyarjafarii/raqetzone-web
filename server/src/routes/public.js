import { Router } from "express";
import { getPublicClubsController } from "../controllers/courtController.js";
import { getClubReviewsController } from "../controllers/reviewController.js";
import { getBookingByTrackingCodeController } from "../controllers/bookingController.js";
import { listPublicAssetsController } from "../controllers/assetController.js";

const router = Router();

router.get("/public/clubs", getPublicClubsController);
router.get("/public/clubs/:clubId/reviews", getClubReviewsController);
router.get("/public/clubs/:clubId/assets", listPublicAssetsController);
router.get("/public/bookings/track/:code", getBookingByTrackingCodeController);

export default router;
