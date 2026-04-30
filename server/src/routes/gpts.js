import express from "express";
import {
  getGPTsController,
  getGPTByIdController,
} from "../controllers/gptController.js";

const router = express.Router();

// GPT routes (public - no authentication required)
router.get("/gpts", getGPTsController);
router.get("/gpts/:gptId", getGPTByIdController);

export default router;

