import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getLeaderboardController } from "../controllers/rankingController.js";

const router = Router();

router.get("/rankings/leaderboard", authMiddleware, getLeaderboardController);

export default router;
