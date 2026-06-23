import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getSpinEligibilityController, performSpinController } from "../controllers/spinWheelController.js";

const router = Router();

router.get("/spin-wheel/eligibility", authMiddleware, getSpinEligibilityController);
router.post("/spin-wheel/spin", authMiddleware, performSpinController);

export default router;
