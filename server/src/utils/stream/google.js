import { GoogleGenAI } from "@google/genai";

import { config } from "../../config/env.js";
import getFileBase64 from "../getFileBase64.js";

const genAI = new GoogleGenAI({
  apiKey: config.googleAiApiKey,
});

export async function streamChatCompletion({ model, messages, onChunk, withWebSearch = false, modelDBSystemPrompt = "" }) {
  try {
    const contents = await convertMessagesToGoogleFormat(messages);

    let options = {
      model,
      contents,
      config: {
        systemInstruction: [config.systemInstruction]
      },
    };

    if(model == "maya") {
      options.config.systemInstruction = [modelDBSystemPrompt, config.systemInstruction];
      model = options.model = "gemini-2.5-flash";
    }

    if(["gemini-2.5-pro", "gemini-2.5-flash"].includes(model)) {
      options.config.thinkingConfig = {
        thinkingBudget: 128,
      }
    }

    // Only enable web search for Gemini models (not Gemma models)
    // Gemma models don't support the googleSearch tool
    const isGeminiModel = model.toLowerCase().startsWith("gemini");
    if(withWebSearch && isGeminiModel) {
      options.config.tools = [
        {
          googleSearch: {},
        },
      ];
    }

    const stream = await genAI.models.generateContentStream(options);

    let fullText = "";

    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        onChunk(chunkText);
      }
    }

    return fullText;
  } catch (error) {
    console.error("Google AI streaming error:", error);
    throw error;
  }
}

export function buildStreamMessages(chatMessages, systemPrompt = null) {
  const messages = [];

  // Add system prompt as first user message if provided
  // Google doesn't have a separate system role, so we include it as context
  if (systemPrompt) {
    messages.push({
      from: "user",
      content: systemPrompt,
      attachments: [],
    });

    messages.push({
      from: "assistant",
      content: "Understood. I will follow these instructions.",
      attachments: [],
    });
  }

  // Add chat messages
  const allMessages = [...messages, ...chatMessages];

  // Return object format for consistency across providers
  return {
    messages: allMessages,
    systemPrompt: null, // Google includes system in messages, so we don't pass it separately
  };
}

async function convertMessagesToGoogleFormat(messages) {
  const contents = [];

  // Process all messages
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const parts = await buildMessageParts(msg);

    contents.push({
      role: msg.from === "user" ? "user" : "model",
      parts: parts,
    });
  }

  return contents;
}

async function buildMessageParts(msg) {
  const parts = [];
  const isAssistant = msg.from !== "user";

  // Add attachments first
  if (msg.attachments && Array.isArray(msg.attachments)) {
    for (const att of msg.attachments) {
      if (isAssistant && att.type === "image") {
        // For assistant messages with images (generated images),
        // add a text description instead of the actual image
        parts.push({ text: `[تصویری که من تولید کردم: ${att.name || "generated-image"}]` });
      } else {
        // For user messages, include the actual image
        const formatted = await formatAttachmentForGoogle(att.url, att.type);
        if (formatted) {
          parts.push(formatted);
        }
      }
    }
  }

  // Add text content
  if (msg.content) {
    parts.push({ text: msg.content });
  }

  return parts;
}

async function formatAttachmentForGoogle(url, type) {
  const { base64, mime } = await getFileBase64(url);

  return {
    inlineData: {
      mimeType: mime || "image/jpeg",
      data: base64,
    },
  };
}
