import { Router } from "express";
import { getPublicClubsController } from "../controllers/courtController.js";
import { getClubReviewsController } from "../controllers/reviewController.js";

const router = Router();

router.get("/public/clubs", getPublicClubsController);
router.get("/public/clubs/:clubId/reviews", getClubReviewsController);

export default router;
