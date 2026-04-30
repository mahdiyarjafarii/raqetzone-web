import {
  streamChatCompletion as streamChatCompletionOpenAI,
  buildStreamMessages as buildStreamMessagesOpenAI,
} from "./openai.js";
import {
  streamChatCompletion as streamChatCompletionAnthropic,
  buildStreamMessages as buildStreamMessagesAnthropic,
} from "./anthropic.js";
import {
  streamChatCompletion as streamChatCompletionGoogle,
  buildStreamMessages as buildStreamMessagesGoogle,
} from "./google.js";
import {
  streamChatCompletion as streamChatCompletionPerplexity,
  buildStreamMessages as buildStreamMessagesPerplexity,
} from "./perplexity.js";

const providers = {
  openai: {
    streamChatCompletion: streamChatCompletionOpenAI,
    buildStreamMessages: buildStreamMessagesOpenAI,
  },
  anthropic: {
    streamChatCompletion: streamChatCompletionAnthropic,
    buildStreamMessages: buildStreamMessagesAnthropic,
  },
  google: {
    streamChatCompletion: streamChatCompletionGoogle,
    buildStreamMessages: buildStreamMessagesGoogle,
  },
  perplexity: {
    streamChatCompletion: streamChatCompletionPerplexity,
    buildStreamMessages: buildStreamMessagesPerplexity,
  },
};

export const streamChatCompletion = async ({
  provider,
  model,
  messagesData,
  withWebSearch = false,
  onChunk,
  modelDBSystemPrompt = ""
}) => {
  // Handle both array (legacy) and object format
  const messages = Array.isArray(messagesData)
    ? messagesData
    : messagesData.messages;
  const systemPrompt = Array.isArray(messagesData)
    ? null
    : messagesData.systemPrompt;

  const normalizedProvider =
    provider == "xai" ? "openai" : provider == "myket" ? "google" : provider;
  const isXAIProvider = provider == "xai";

  return providers[normalizedProvider].streamChatCompletion({
    model,
    messages,
    onChunk,
    systemPrompt,
    isXAI: isXAIProvider,
    withWebSearch,
    modelDBSystemPrompt
  });
};

export const buildStreamMessages = async (provider, ...params) => {
  if (provider == "myket") provider = "google";
  if (provider == "xai") provider = "openai";
  
  return await providers[provider].buildStreamMessages(...params);
};
