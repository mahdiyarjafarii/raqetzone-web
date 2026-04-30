import { eq, and, desc, asc, gt } from "drizzle-orm";

import { db } from "../db/index.js";
import { log } from "../utils/logger.js";
import {
  chats,
  messages,
  gpts,
  messageReactions,
  models,
} from "../db/schema.js";
import {
  streamChatCompletion,
  buildStreamMessages,
} from "../utils/stream/index.js";
import { enrichMessagesWithFileContent } from "../utils/message-enricher.js";
import {
  checkUserHasEnoughCredits,
  deductUserCredits,
} from "../utils/credits/checkUserCredit.js";
import { globalSystemPrompt } from "../config/prompts.js";
import {
  isCachedPrompt,
  getCachedPromptResponse,
  setCachedPromptResponse,
  streamFakeResponse,
} from "../utils/cachedPrompts.js";

/**
 * Create a new empty chat
 */
export const createChatController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `chat_create_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userId = req.user.id;
    const { gptId } = req.body;

    // If gptId is provided, verify it exists
    if (gptId) {
      const [gpt] = await db
        .select()
        .from(gpts)
        .where(eq(gpts.id, gptId))
        .limit(1);

      if (!gpt) {
        const duration = Date.now() - startTime;
        log.error("❌ CHAT CREATE FAILED - GPT not found", {
          requestId,
          userId,
          gptId,
          error: "gpt not found",
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
        return res.status(404).json({ message: "GPT یافت نشد" });
      }
    }

    // Create new chat
    const [chat] = await db
      .insert(chats)
      .values({
        userId,
        gptId: gptId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return res.status(201).json({
      chat: {
        id: chat.id,
        gptId: chat.gptId,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ CHAT CREATE FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      gptId: req.body?.gptId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Get all messages for a chat
 */
export const getChatMessagesController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `chat_msgs_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1);

    if (!chat) {
      const duration = Date.now() - startTime;
      log.error("❌ GET CHAT MESSAGES FAILED - Chat not found", {
        requestId,
        userId,
        chatId,
        error: "chat not found or unauthorized",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "چت یافت نشد" });
    }

    // Get all messages
    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);

    // Get user's reactions for these messages
    const messageIds = chatMessages.map((msg) => msg.id);
    const reactions = await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.userId, userId));

    // Create a map of messageId -> reaction
    const reactionsMap = {};
    reactions.forEach((reaction) => {
      if (messageIds.includes(reaction.messageId)) {
        reactionsMap[reaction.messageId] = reaction.reaction;
      }
    });

    let gpt = null;
    if (chat.gptId) {
      gpt = await db
        .select({
          id: gpts.id,
          name: gpts.name,
          image: gpts.image,
        })
        .from(gpts)
        .where(eq(gpts.id, chat.gptId))
        .limit(1);

      if (gpt.length > 0) gpt = gpt[0];
    }

    // Get the last used model from the database
    let lastUsedModel = null;
    const lastMessageModel = chatMessages[chatMessages.length - 1]?.model;
    if (lastMessageModel) {
      const [modelData] = await db
        .select()
        .from(models)
        .where(eq(models.slug, lastMessageModel))
        .limit(1);
      lastUsedModel = modelData || null;
    }

    return res.status(200).json({
      messages: chatMessages.map((msg) => ({
        ...msg,
        attachments: msg.attachments || [],
        reaction: reactionsMap[msg.id] || null,
      })),
      gpt,
      lastUsedModel,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ GET CHAT MESSAGES FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      chatId: req.params?.chatId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Send a message and stream AI response
 */
export const sendMessageController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `chat_send_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { message, retryMessageId, model, withWebSearch, isCharacter } =
      req.body;

    let { images } = req.body;
    const files = req.files || {};
    if (!model) {
      const duration = Date.now() - startTime;
      log.error("❌ SEND MESSAGE FAILED - Model missing", {
        requestId,
        userId,
        chatId,
        error: "model not provided",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ message: "مدل چت الزامی است" });
    }

    const creditCheck = await checkUserHasEnoughCredits(
      userId,
      model,
      null,
      isCharacter
    );
    if (!creditCheck.hasEnough) return res.status(400).json({ message: creditCheck.message });

    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1);

    if (!chat) {
      const duration = Date.now() - startTime;
      log.error("❌ SEND MESSAGE FAILED - Chat not found", {
        requestId,
        userId,
        chatId,
        error: "chat not found",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "چت یافت نشد" });
    }

    // Process uploaded files
    const attachments = [];
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // we comment this code cause we use myket browser
    // if (files.images) {
    //   files.images.forEach((file) => {
    //     const currentDate = new Date().toISOString().split("T")[0];
    //     const url = `${baseUrl}/uploads/attachment/${currentDate}/${file.filename}`;
    //     attachments.push({
    //       type: "image",
    //       url,
    //       name: file.originalname,
    //     });
    //   });
    // }

    if (!!images) {
      images = JSON.parse(images);

      for (const image of images) {
        attachments.push({
          type: "image",
          url: image.url,
          name: image.fileName,
        });
      }
    }

    if (files.files) {
      files.files.forEach((file) => {
        const currentDate = new Date().toISOString().split("T")[0];
        const url = `${baseUrl}/uploads/attachment/${currentDate}/${file.filename}`;
        attachments.push({
          type: "file",
          url,
          name: file.originalname,
        });
      });
    }

    // Save user message
    let newMessageId = null;
    if (retryMessageId) {
      // remove the messages that their createdAt is greater than the retryMessageId
      const [messageToRetry] = await db
        .select()
        .from(messages)
        .where(
          and(eq(messages.id, retryMessageId), eq(messages.chatId, chatId))
        )
        .limit(1);

      if (!messageToRetry) {
        const duration = Date.now() - startTime;
        log.error("❌ SEND MESSAGE FAILED - Retry message not found", {
          requestId,
          userId,
          chatId,
          retryMessageId,
          error: "retry message not found",
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
        return res.status(404).json({ message: "پیام یافت نشد" });
      }

      await db
        .delete(messages)
        .where(
          and(
            eq(messages.chatId, chatId),
            gt(messages.createdAt, messageToRetry.createdAt)
          )
        );

      newMessageId = messageToRetry.id;
    } else {
      const [newMessage] = await db
        .insert(messages)
        .values({
          chatId,
          from: "user",
          content: message || "",
          attachments,
          createdAt: new Date(),
        })
        .returning();

      newMessageId = newMessage.id;
    }

    // Get chat history
    const chatHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);

    // Check if this is a cached prompt (first message, no attachments, no retry)
    const isFirstMessage = chatHistory.length === 1; // Only the user message we just saved
    const hasAttachments = attachments.length > 0;
    const shouldCheckCache =
      isFirstMessage &&
      !hasAttachments &&
      !retryMessageId &&
      isCachedPrompt(message);

    // If this is a cached prompt, check for cached response
    if (shouldCheckCache) {
      const cachedResponse = await getCachedPromptResponse(message, model);

      if (cachedResponse) {
        // Set headers for streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Stream the fake response
        await streamFakeResponse(res, cachedResponse);

        // Save assistant message with cached response
        const [newAiMessage] = await db
          .insert(messages)
          .values({
            chatId,
            from: "assistant",
            content: cachedResponse,
            attachments: [],
            createdAt: new Date(),
            model,
          })
          .returning();

        // Update chat title if it's the first message
        if (message) {
          const title =
            message.slice(0, 50) + (message.length > 50 ? "..." : "");
          await db
            .update(chats)
            .set({ title, updatedAt: new Date() })
            .where(eq(chats.id, chatId));
        }

        // Deduct credits
        const isCharacterBool = isCharacter === true || isCharacter === "true";
        let requiredCredits = isCharacterBool
          ? 15
          : creditCheck.requiredCredits;
        const creditDeduct = await deductUserCredits(
          userId,
          model,
          requiredCredits
        );
        if (!creditDeduct.success && !res.headersSent) {
          return res.status(500).json({ message: creditDeduct.message });
        }

        // Send completion data
        res.write(
          `data: ${JSON.stringify({
            newMessageId,
            newAiMessageId: newAiMessage.id,
            credits: {
              remaining: creditDeduct.remainingCredits,
              required: creditCheck.requiredCredits,
            },
          })}\n\n`
        );
        res.write("data: [DONE]\n\n");
        res.end();

        return;
      }
    }

    // Enrich messages with file content (parse and add file content to message text)
    const enrichedChatHistory = await enrichMessagesWithFileContent(
      chatHistory
    );

    // Get GPT system prompt if chat has a GPT
    let systemPrompt = null;
    if (chat.gptId) {
      const [gpt] = await db
        .select()
        .from(gpts)
        .where(eq(gpts.id, chat.gptId))
        .limit(1);

      if (gpt) systemPrompt = gpt.systemPrompt;
    }

    systemPrompt += `\n${globalSystemPrompt}`;

    let [provider] = await db
      .select()
      .from(models)
      .where(eq(models.slug, model))
      .limit(1);

    if (!provider) {
      const duration = Date.now() - startTime;
      log.error("❌ SEND MESSAGE FAILED - Model not found", {
        requestId,
        userId,
        chatId,
        model,
        error: "model not found in database",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "مدل یافت نشد" });
    }

    // this is the system prompt that the model has on the database
    let modelDBSystemPrompt = provider.systemPrompt;
    provider = provider.provider.toLowerCase();

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let assistantResponse = "";

    // Stream response from AI with enriched messages
    await streamChatCompletion({
      provider,
      model,
      messagesData: await buildStreamMessages(
        provider,
        enrichedChatHistory,
        systemPrompt
      ),
      withWebSearch,
      onChunk: (chunk) => {
        assistantResponse += chunk;
        // Send chunk to client in SSE format
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      },
      modelDBSystemPrompt,
    });

    // If this was a cached prompt without cached response, cache it now
    if (shouldCheckCache && assistantResponse) {
      await setCachedPromptResponse(message, model, assistantResponse);
    }

    // Save assistant message
    const [newAiMessage] = await db
      .insert(messages)
      .values({
        chatId,
        from: "assistant",
        content: assistantResponse,
        attachments: [],
        createdAt: new Date(),
        model,
      })
      .returning();

    // Update chat title if it's the first message
    if (chatHistory.length === 1 && message) {
      const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
      await db
        .update(chats)
        .set({ title, updatedAt: new Date() })
        .where(eq(chats.id, chatId));
    }

    // Convert isCharacter to boolean (handles string "true"/"false" from req.body)
    const isCharacterBool = isCharacter === true || isCharacter === "true";
    let requiredCredits = isCharacterBool ? 15 : creditCheck.requiredCredits;
    const creditDeduct = await deductUserCredits(
      userId,
      model,
      requiredCredits
    );
    if (!creditDeduct.success && !res.headersSent)
      return res.status(500).json({ message: creditDeduct.message });

    // Send user the remaining and required credits after deduction
    res.write(
      `data: ${JSON.stringify({
        newMessageId,
        newAiMessageId: newAiMessage.id,
        credits: {
          remaining: creditDeduct.remainingCredits,
          required: creditCheck.requiredCredits,
        },
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ SEND MESSAGE FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      chatId: req.params?.chatId,
      model: req.body?.model,
      error: error.message,
      stack: error.stack,
      headersSent: res.headersSent,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    // If headers already sent, we can't send JSON error
    if (res.headersSent) {
      res.end();
    } else {
      return res.status(500).json({ message: "خطای سرور" });
    }
  }
};

/**
 * Get all chats for user
 */
export const getUserChatsController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `get_chats_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userId = req.user.id;

    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt));

    return res.status(200).json({
      chats: userChats.map((chat) => ({
        id: chat.id,
        title: chat.title || "چت جدید",
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      })),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ GET USER CHATS FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Update chat title
 */
export const updateChatTitleController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `update_title_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "عنوان نمی‌تواند خالی باشد" });
    }

    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1);

    if (!chat) {
      const duration = Date.now() - startTime;
      log.error("❌ UPDATE CHAT TITLE FAILED - Chat not found", {
        requestId,
        userId,
        chatId,
        error: "chat not found",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "چت یافت نشد" });
    }

    // Update chat title
    const [updatedChat] = await db
      .update(chats)
      .set({
        title: title.trim(),
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId))
      .returning();

    return res.status(200).json({
      chat: {
        id: updatedChat.id,
        title: updatedChat.title,
        updatedAt: updatedChat.updatedAt,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ UPDATE CHAT TITLE FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      chatId: req.params?.chatId,
      title: req.body?.title,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Delete a chat
 */
export const deleteChatController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `delete_chat_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1);

    if (!chat) {
      const duration = Date.now() - startTime;
      log.error("❌ DELETE CHAT FAILED - Chat not found", {
        requestId,
        userId,
        chatId,
        error: "chat not found",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "چت یافت نشد" });
    }

    // Delete chat (messages will be cascade deleted)
    await db.delete(chats).where(eq(chats.id, chatId));

    return res.status(200).json({ message: "چت با موفقیت حذف شد" });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ DELETE CHAT FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      chatId: req.params?.chatId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * React to a message (like or dislike)
 */
export const reactToMessageController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `react_msg_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { reaction } = req.body;

    // Validate reaction type
    if (!["like", "dislike"].includes(reaction)) {
      return res.status(400).json({ message: "نوع واکنش نامعتبر است" });
    }

    // Get the message and verify it belongs to a chat the user owns
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return res.status(404).json({ message: "پیام یافت نشد" });
    }

    // Verify the chat belongs to the user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, message.chatId), eq(chats.userId, userId)))
      .limit(1);

    if (!chat) {
      const duration = Date.now() - startTime;
      log.error("❌ REACT TO MESSAGE FAILED - Unauthorized", {
        requestId,
        userId,
        messageId,
        chatId: message.chatId,
        error: "unauthorized access",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "دسترسی غیرمجاز" });
    }

    // Check if user already reacted to this message
    const [existingReaction] = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId)
        )
      )
      .limit(1);

    if (existingReaction) {
      // Update existing reaction
      await db
        .update(messageReactions)
        .set({ reaction, createdAt: new Date() })
        .where(eq(messageReactions.id, existingReaction.id));
    } else {
      // Create new reaction
      await db.insert(messageReactions).values({
        messageId,
        userId,
        reaction,
        createdAt: new Date(),
      });
    }

    return res
      .status(200)
      .json({ message: "واکنش با موفقیت ثبت شد", reaction });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ REACT TO MESSAGE FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      messageId: req.params?.messageId,
      reaction: req.body?.reaction,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Get reactions for messages in a chat
 */
export const getMessageReactionsController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `get_reactions_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1);

    if (!chat) {
      const duration = Date.now() - startTime;
      log.error("❌ GET MESSAGE REACTIONS FAILED - Chat not found", {
        requestId,
        userId,
        chatId,
        error: "chat not found",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "چت یافت نشد" });
    }

    // Get all messages for the chat
    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId));

    const messageIds = chatMessages.map((msg) => msg.id);

    // Get all reactions for these messages
    const reactions = await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.userId, userId));

    // Create a map of messageId -> reaction
    const reactionsMap = {};
    reactions.forEach((reaction) => {
      if (messageIds.includes(reaction.messageId)) {
        reactionsMap[reaction.messageId] = reaction.reaction;
      }
    });

    return res.status(200).json({ reactions: reactionsMap });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ GET MESSAGE REACTIONS FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      chatId: req.params?.chatId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Get Chat Messages Ids
 */
export const getChatMessagesIdsController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `get_msg_ids_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { chatId } = req.params;

    const chatMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.chatId, chatId));

    const messageIds = chatMessages.map((msg) => msg.id) || [];

    return res.status(200).json({ ids: messageIds });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ GET CHAT MESSAGE IDS FAILED - Unexpected error", {
      requestId,
      chatId: req.params?.chatId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Save image generation messages to chat
 * This saves both the user prompt and the AI-generated image as messages
 * POST /api/chats/:chatId/image-generation
 */
export const saveImageGenerationMessagesController = async (req, res) => {
  const startTime = Date.now();
  const requestId = `img_gen_msg_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { prompt, imageUrl, imageName, model } = req.body;

    // Validate inputs
    if (!prompt || !imageUrl) {
      return res.status(400).json({ message: "پرامپت و تصویر الزامی است" });
    }

    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1);

    if (!chat) {
      const duration = Date.now() - startTime;
      log.error("❌ SAVE IMAGE GENERATION FAILED - Chat not found", {
        requestId,
        userId,
        chatId,
        error: "chat not found",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "چت یافت نشد" });
    }

    // Check if this is the first message in the chat
    const existingMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .limit(1);

    const isFirstMessage = existingMessages.length === 0;

    // Save user message (the prompt)
    const [userMessage] = await db
      .insert(messages)
      .values({
        chatId,
        from: "user",
        content: prompt,
        attachments: [],
        createdAt: new Date(),
      })
      .returning();

    // Save assistant message (with generated image)
    const [assistantMessage] = await db
      .insert(messages)
      .values({
        chatId,
        from: "assistant",
        content: "",
        attachments: [
          {
            type: "image",
            url: imageUrl,
            name: imageName || "generated-image.png",
          },
        ],
        model: model || "Image Generation",
        createdAt: new Date(),
      })
      .returning();

    // Update chat title if it's the first message
    if (isFirstMessage) {
      const title = prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
      await db
        .update(chats)
        .set({ title, updatedAt: new Date() })
        .where(eq(chats.id, chatId));
    }

    return res.status(201).json({
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("❌ SAVE IMAGE GENERATION FAILED - Unexpected error", {
      requestId,
      userId: req.user?.id,
      chatId: req.params?.chatId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({ message: "خطای سرور" });
  }
};
