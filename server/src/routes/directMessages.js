import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getConversationsController,
  startConversationController,
  getMessagesController,
  sendMessageController,
  markReadController,
} from "../controllers/directMessagesController.js";

const router = Router();

router.use(authMiddleware);

router.get("/conversations", getConversationsController);
router.post("/conversations", startConversationController);
router.get("/conversations/:conversationId/messages", getMessagesController);
router.post("/conversations/:conversationId/messages", sendMessageController);
router.patch("/conversations/:conversationId/read", markReadController);

export default router;
