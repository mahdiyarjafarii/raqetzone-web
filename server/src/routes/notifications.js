import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getNotificationsController,
  getUnreadCountController,
  markReadController,
  markAllReadController,
  deleteNotificationController,
  sendNotificationController,
  broadcastNotificationController,
} from "../controllers/notificationController.js";

const router = Router();

// User
router.get("/notifications",              authMiddleware, getNotificationsController);
router.get("/notifications/unread-count", authMiddleware, getUnreadCountController);
router.patch("/notifications/read-all",   authMiddleware, markAllReadController);
router.patch("/notifications/:id/read",   authMiddleware, markReadController);
router.delete("/notifications/:id",       authMiddleware, deleteNotificationController);

// Admin / System
router.post("/notifications/send",        authMiddleware, sendNotificationController);
router.post("/notifications/broadcast",   authMiddleware, broadcastNotificationController);

export default router;
