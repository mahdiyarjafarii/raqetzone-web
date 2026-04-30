import OpenAI from "openai";

import { config } from "../../config/env.js";
import getFileBase64 from "../getFileBase64.js";

export async function streamChatCompletion({
  model,
  messages,
  onChunk,
  isXAI = false,
  isThinkingMode = false,
  modelDBSystemPrompt
}) {
  try {
    const isThinkingModeBool =
      isThinkingMode === true || isThinkingMode === "true";
    const openai = new OpenAI({
      apiKey: isXAI ? config.xaiApiKey : config.openaiApiKey,
      baseURL: isXAI ? "https://api.x.ai/v1" : undefined,
    });

    const finalMessages = [
      { role: "system", content: config.systemInstruction },
      ...messages,
    ];

    // Use Responses API for thinking mode (gpt-5 with reasoning)
    if (isThinkingModeBool) {
      const responseStream = await openai.responses.create({
        model: "gpt-5",
        reasoning: { effort: "medium" },
        input: finalMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      });

      let fullText = "";
      for await (const event of responseStream) {
        // Capture streamed text deltas
        const delta =
          event?.type === "response.output_text.delta"
            ? event.delta
            : event?.output_text ?? "";
        if (delta) {
          fullText += delta;
          onChunk(delta);
        }
      }
      return fullText;
    }

    let options = {
      model: isThinkingModeBool ? "gpt-5.1-thinking" : model,
      messages,
      stream: true,
    };

    const stream = await openai.chat.completions.create({
      ...options,
      messages: finalMessages,
    });

    let fullText = "";

    for await (const chunk of stream) {
      const choice = chunk.choices[0];

      // Handle regular content
      const content = choice?.delta?.content || "";
      if (content) {
        fullText += content;
        onChunk(content);
      }
    }

    return fullText;
  } catch (error) {
    console.error("OpenAI streaming error:", error);
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
  const formattedMessages = await Promise.all(chatMessages.map(async (msg) => {
    const content = [];
    const isAssistant = msg.from !== "user";

    // Add text content
    if (msg.content) {
      content.push({
        type: "text",
        text: msg.content,
      });
    }

    // Handle attachments differently for user vs assistant
    if (msg.attachments && Array.isArray(msg.attachments)) {
      for(const att of msg.attachments) {
        if (isAssistant && att.type === "image") {
          // For assistant messages with images (generated images),
          // add a text description instead of the actual image
          // OpenAI doesn't allow image URLs in assistant messages
          content.push({
            type: "text",
            text: `[تصویری که من تولید کردم: ${att.name || "generated-image"}]`,
          });
        } else {
          // For user messages, include the actual image
          const formatted = await formatAttachmentForOpenAI(att.url, att.type);
          if (formatted) content.push(formatted);
        }
      }
    }

    return {
      role: isAssistant ? "assistant" : "user",
      content:
        content.length === 1 && content[0].type === "text"
          ? content[0].text
          : content,
    };
  }));

  const allMessages = [...messages, ...formattedMessages];

  // Return in object format for consistency across providers
  return {
    messages: allMessages,
    systemPrompt: null, // OpenAI includes system in messages, so we don't pass it separately
  };
}

async function formatAttachmentForOpenAI(url, type) {
  try {
    const { base64, mime } = await getFileBase64(url);

    return {
      type: "image_url",
      image_url: {
        url: `data:${mime || 'image/png'};base64,${base64}`,
      },
    };
  } catch (error) {
    console.error("Error formatting attachment for OpenAI:", error);
    return null;
  }
}
