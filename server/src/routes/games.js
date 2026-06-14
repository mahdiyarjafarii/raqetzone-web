import { Router } from "express";

import {
  getTennisDuelHistoryController,
  getTennisDuelOverviewController,
  startTennisDuelController,
  submitTennisDuelController,
} from "../controllers/gameController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/games/tennis-duel", authMiddleware, getTennisDuelOverviewController);
router.get("/games/tennis-duel/history", authMiddleware, getTennisDuelHistoryController);
router.post("/games/tennis-duel/start", authMiddleware, startTennisDuelController);
router.post("/games/tennis-duel/:sessionId/submit", authMiddleware, submitTennisDuelController);

export default router;
