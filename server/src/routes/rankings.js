import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getActivePeriodsController, getLeaderboardController, getMonthlyHistoryController } from "../controllers/rankingController.js";

const router = Router();

router.get("/rankings/leaderboard", authMiddleware, getLeaderboardController);
router.get("/rankings/history", authMiddleware, getMonthlyHistoryController);
router.get("/rankings/periods", authMiddleware, getActivePeriodsController);

export default router;
