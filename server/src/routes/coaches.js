import { Router } from "express";

import { authMiddleware } from "../middleware/auth.js";
import {
  createCoachPrivateSessionController,
  createCoachClassController,
  enrollCoachClassController,
  getCoachReviewsController,
  getCoachClassEnrollmentsController,
  getCoachClassDetailController,
  getCoachDetailController,
  getMyCoachClassesController,
  getMyCoachPrivateSessionsController,
  getMyCoachReviewsController,
  getCoachesController,
  getAllClassesController,
  replyCoachReviewController,
  upsertCoachReviewController,
  updateCoachPrivateSessionController,
  updateCoachClassController,
} from "../controllers/coachController.js";

const router = Router();

router.get("/coaches", getCoachesController);
router.get("/classes", getAllClassesController);
router.get("/coaches/me/classes", authMiddleware, getMyCoachClassesController);
router.get("/coaches/me/private-sessions", authMiddleware, getMyCoachPrivateSessionsController);
router.get("/coaches/me/reviews", authMiddleware, getMyCoachReviewsController);
router.get("/coaches/:coachId", getCoachDetailController);
router.get("/coaches/:coachId/reviews", getCoachReviewsController);
router.post("/coaches/:coachId/reviews", authMiddleware, upsertCoachReviewController);
router.post("/coaches/:coachId/private-sessions", authMiddleware, createCoachPrivateSessionController);
router.get("/coach-classes/:classId", getCoachClassDetailController);
router.get("/coach-classes/:classId/enrollments", authMiddleware, getCoachClassEnrollmentsController);

router.post("/coaches/classes", authMiddleware, createCoachClassController);
router.patch("/coaches/classes/:classId", authMiddleware, updateCoachClassController);
router.patch("/coach-private-sessions/:sessionId", authMiddleware, updateCoachPrivateSessionController);
router.post("/coach-reviews/:reviewId/reply", authMiddleware, replyCoachReviewController);
router.post("/coach-classes/:classId/enroll", authMiddleware, enrollCoachClassController);

export default router;
