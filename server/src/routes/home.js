import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getHomeController } from "../controllers/homeController.js";

const router = Router();

router.get("/home", authMiddleware, getHomeController);

export default router;
