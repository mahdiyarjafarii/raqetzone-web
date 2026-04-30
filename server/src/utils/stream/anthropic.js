import Anthropic from "@anthropic-ai/sdk";

import { config } from "../../config/env.js";
import getFileBase64 from "../getFileBase64.js";

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export async function streamChatCompletion({
  model,
  messages,
  onChunk,
  systemPrompt = null,
  withWebSearch = false,
}) {
  try {
    // Prepare the request parameters
    const requestParams = {
      model,
      messages,
      max_tokens: 4096,
      stream: true,
      system: config.systemInstruction
    };

    // Add system prompt if provided (Anthropic requires it as a separate parameter)
    if (systemPrompt) requestParams.system = systemPrompt;

    if(withWebSearch) {
      requestParams.tools = [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ];
    }

    const stream = anthropic.messages.stream(requestParams);

    let fullText = "";

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const content = chunk.delta.text || "";
        if (content) {
          fullText += content;
          onChunk(content);
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error("Anthropic streaming error:", error);
    throw error;
  }
}

export async function buildStreamMessages(chatMessages, systemPrompt = null) {
  const formattedMessages = await Promise.all(
    chatMessages.map(async (msg) => {
      const content = [];
      const isAssistant = msg.from !== "user";

      // Add text content (only if non-empty)
      if (msg.content && msg.content.trim()) {
        content.push({
          type: "text",
          text: msg.content,
        });
      }

      // Add attachments
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (isAssistant && att.type === "image") {
            // For assistant messages with images (generated images),
            // add a text description instead of the actual image
            // Anthropic doesn't allow images in assistant messages
            content.push({
              type: "text",
              text: `[تصویری که من تولید کردم: ${att.name || "generated-image"}]`,
            });
          } else {
            // For user messages, include the actual image
            const formatted = await formatAttachmentForAnthropic(att.url, att.type);
            if (formatted) content.push(formatted);
          }
        }
      }

      // Skip messages with no content (Anthropic requires non-empty content)
      if (content.length === 0) {
        return null;
      }

      return {
        role: isAssistant ? "assistant" : "user",
        content:
          content.length === 1 && content[0].type === "text"
            ? content[0].text
            : content,
      };
    })
  );
  const filteredMessages = formattedMessages.filter((msg) => msg !== null);

  const mergedMessages = [];
  for (const msg of filteredMessages) {
    const lastMsg = mergedMessages[mergedMessages.length - 1];
    if (lastMsg && lastMsg.role === msg.role) {
      // Merge with previous message of same role
      if (typeof lastMsg.content === "string" && typeof msg.content === "string") {
        lastMsg.content = lastMsg.content + "\n" + msg.content;
      } else {
        // Convert to array format and merge
        const lastContent = Array.isArray(lastMsg.content)
          ? lastMsg.content
          : [{ type: "text", text: lastMsg.content }];
        const currentContent = Array.isArray(msg.content)
          ? msg.content
          : [{ type: "text", text: msg.content }];
        lastMsg.content = [...lastContent, ...currentContent];
      }
    } else {
      mergedMessages.push(msg);
    }
  }
  return {
    messages: mergedMessages,
    systemPrompt: systemPrompt, // Anthropic needs system prompt passed separately
  };
}

async function formatAttachmentForAnthropic(url, type) {
  try {
    const { base64, mime } = await getFileBase64(url);
    if (!base64) return null;
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mime,
        data: base64,
      },
    };
  } catch (error) {
    console.error("Error formatting attachment for Anthropic:", error);
    return null;
  }
}
