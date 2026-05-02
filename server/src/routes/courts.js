import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getCourtsController,
  getCourtByIdController,
  getCourtAvailabilityController,
} from "../controllers/courtController.js";

const router = Router();

router.get("/courts", authMiddleware, getCourtsController);
router.get("/courts/:id", authMiddleware, getCourtByIdController);
router.get("/courts/:id/availability", authMiddleware, getCourtAvailabilityController);

export default router;
