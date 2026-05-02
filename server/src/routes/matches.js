import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getMatchesController,
  getMatchByIdController,
  joinMatchController,
  leaveMatchController,
  createMatchController,
} from "../controllers/matchController.js";

const router = Router();

router.get("/matches", authMiddleware, getMatchesController);
router.get("/matches/:id", authMiddleware, getMatchByIdController);
router.post("/matches", authMiddleware, createMatchController);
router.post("/matches/:id/join", authMiddleware, joinMatchController);
router.delete("/matches/:id/leave", authMiddleware, leaveMatchController);

export default router;
