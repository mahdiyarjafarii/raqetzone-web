import express from "express";
import {
  createChatController,
  getChatMessagesController,
  sendMessageController,
  getUserChatsController,
  updateChatTitleController,
  deleteChatController,
  reactToMessageController,
  getMessageReactionsController,
  getChatMessagesIdsController,
  saveImageGenerationMessagesController,
} from "../controllers/chatController.js";
import { authMiddleware } from "../middleware/auth.js";
import { createUpload } from "../config/multer.js";

const upload = createUpload("attachment");

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// Chat routes
router.post("/chats", createChatController);
router.get("/chats", getUserChatsController);
router.get("/chats/:chatId/messages", getChatMessagesController);
router.get("/chats/:chatId/messages/ids", getChatMessagesIdsController);
router.post(
  "/chats/:chatId/messages",
  upload.fields([
    // { name: "images", maxCount: 10 },
    { name: "files", maxCount: 10 },
  ]),
  sendMessageController
);
router.patch("/chats/:chatId/title", updateChatTitleController);
router.delete("/chats/:chatId", deleteChatController);

// Message reaction routes
router.post("/messages/:messageId/react", reactToMessageController);
router.get("/chats/:chatId/reactions", getMessageReactionsController);

// Image generation message route
router.post("/chats/:chatId/image-generation", saveImageGenerationMessagesController);

export default router;
