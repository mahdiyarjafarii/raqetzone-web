import express from "express";
import {
  getModelsController,
  getModelsGroupedByProviderController,
  getModelsByProviderController,
} from "../controllers/modelController.js";

const router = express.Router();

// Models routes (public - no authentication required)
router.get("/models", getModelsController);
router.get("/models/grouped", getModelsGroupedByProviderController);
router.get("/models/provider/:provider", getModelsByProviderController);

export default router;

