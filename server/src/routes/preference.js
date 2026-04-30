import express from "express";

import {
  getPreferenceController,
  setPreferenceController,
  getBatchPreferencesController,
  removeAllPreferencesController,
} from "../controllers/preferenceController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/preferences/remove", removeAllPreferencesController);

// All other preference routes require authentication
router.use(authMiddleware);

// Preference routes
router.get("/preference/:key", getPreferenceController);
router.post("/preference/:key", setPreferenceController);
router.post("/preferences/batch", getBatchPreferencesController);

export default router;
