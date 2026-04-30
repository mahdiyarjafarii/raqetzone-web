import OpenAI from "openai";

import { config } from "../../config/env.js";
import getFileBase64 from "../getFileBase64.js";

export async function streamChatCompletion({
  model,
  messages,
  onChunk,
  onCitations,
}) {
  try {
    let isDeepResearch = model.startsWith("perplexity/") ? true : false;

    const client = new OpenAI({
      baseURL: isDeepResearch ? "https://openrouter.ai/api/v1" : "https://api.perplexity.ai/",
      apiKey: isDeepResearch ? config.openRouterApiKey : config.perplexityApiKey,
    });

    // Filter messages to ensure all messages have non-empty content
    const validMessages = messages.filter((msg) => {
      if (typeof msg.content === "string") {
        return msg.content.trim() !== "";
      }
      if (Array.isArray(msg.content)) {
        return msg.content.length > 0;
      }
      return false;
    });

    // Merge consecutive messages with the same role (required by Perplexity API)
    const mergedMessages = [];
    for (const msg of validMessages) {
      const lastMsg = mergedMessages[mergedMessages.length - 1];
      if (lastMsg && lastMsg.role === msg.role) {
        // Merge content with the previous message
        if (typeof lastMsg.content === "string" && typeof msg.content === "string") {
          lastMsg.content = lastMsg.content + "\n" + msg.content;
        } else {
          // Handle array content
          const lastContent = Array.isArray(lastMsg.content)
            ? lastMsg.content
            : [{ type: "text", text: lastMsg.content }];
          const currentContent = Array.isArray(msg.content)
            ? msg.content
            : [{ type: "text", text: msg.content }];
          lastMsg.content = [...lastContent, ...currentContent];
        }
      } else {
        mergedMessages.push({ ...msg });
      }
    }

    const stream = await client.chat.completions.create({
      model,
      messages: mergedMessages,
      stream: true,
    });

    let fullText = "";
    let citations = [];

    for await (const chunk of stream) {
      // Collect citations from the chunk
      if (chunk.citations && chunk.citations.length > 0) {
        citations = chunk.citations;
      }

      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        onChunk(content);
      }
    }

    // Add citations at the end if available
    if (citations.length > 0) {
      const citationsText =
        "\n\n**References:**\n" +
        citations.map((cite, idx) => `[${idx + 1}] ${cite}`).join("\n");
      fullText += citationsText;
      onChunk(citationsText);
      
      // Call onCitations callback if provided
      if (onCitations && typeof onCitations === "function") {
        onCitations(citations);
      }
    }

    return fullText;
  } catch (error) {
    console.error("Perplexity streaming error:", error);
    throw error;
  }
}

export async function buildStreamMessages(chatMessages, systemPrompt = null) {
  const messages = [];

  // Add system prompt if provided
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  // Add chat messages
  const formattedMessages = await Promise.all(
    chatMessages.map(async (msg) => {
      const content = [];

      // Add text content
      if (msg.content) {
        content.push({
          type: "text",
          text: msg.content,
        });
      }

      // Add attachments
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          const formatted = await formatAttachmentForPerplexity(att.url, att.type);
          if (formatted) content.push(formatted);
        }
      }

      return {
        role: msg.from === "user" ? "user" : "assistant",
        content:
          content.length === 1 && content[0].type === "text"
            ? content[0].text
            : content,
      };
    })
  );

  const allMessages = [...messages, ...formattedMessages];

  // Return in object format for consistency across providers
  return {
    messages: allMessages,
    systemPrompt: null,
  };
}

async function formatAttachmentForPerplexity(url, type) {
  try {
    const { base64, mime } = await getFileBase64(url);

    return {
      type: "image_url",
      image_url: {
        url: `data:${mime || "image/png"};base64,${base64}`,
      },
    };
  } catch (error) {
    console.error("Error formatting attachment for Perplexity:", error);
    return null;
  }
}

