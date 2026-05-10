import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { clubOwnerMiddleware } from "../middleware/clubOwnerAuth.js";
import {
  upsertClubReviewController,
  deleteClubReviewController,
  replyToReviewController,
} from "../controllers/reviewController.js";

const router = Router();

// Auth required
router.post("/clubs/:clubId/reviews", authMiddleware, upsertClubReviewController);
router.delete("/reviews/:id", authMiddleware, deleteClubReviewController);

// Club owner/admin
router.post("/club-panel/reviews/:id/reply", clubOwnerMiddleware, replyToReviewController);

export default router;
