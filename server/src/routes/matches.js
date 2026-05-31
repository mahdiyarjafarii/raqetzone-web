import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/adminAuth.js";
import {
  getMatchesController,
  getMatchByIdController,
  joinMatchController,
  leaveMatchController,
  createMatchController,
  certifyMatchController,
  emergencySubController,
  rateMatchController,
  getCompatibilityController,
  getInviteLinkController,
  getMatchByInviteTokenController,
} from "../controllers/matchController.js";

const router = Router();

router.get("/matches", authMiddleware, getMatchesController);
router.get("/matches/:id", authMiddleware, getMatchByIdController);
router.post("/matches", authMiddleware, createMatchController);
router.post("/matches/:id/join", authMiddleware, joinMatchController);
router.delete("/matches/:id/leave", authMiddleware, leaveMatchController);

router.post("/matches/:id/emergency-sub", authMiddleware, emergencySubController);
router.post("/matches/:id/rate", authMiddleware, rateMatchController);
router.get("/matches/:id/compatibility", authMiddleware, getCompatibilityController);
router.get("/matches/:id/invite", authMiddleware, getInviteLinkController);

// Public invite link lookup (no auth)
router.get("/public/matches/invite/:token", getMatchByInviteTokenController);

// Admin-only
router.patch("/matches/:id/certify", authMiddleware, adminMiddleware, certifyMatchController);

export default router;
