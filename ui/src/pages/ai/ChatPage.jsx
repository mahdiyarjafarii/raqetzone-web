import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import AiActions from "@/components/ui/ai-actions";
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import apiClient from "@/lib/apiClient";
import authStorage from "@/auth/storage";
import {
  currentModelAtom,
  showHintAlertModalAtom,
  hasTitleReachLimitPricingSheetAtom,
  isThinkingModeAtom,
  currentImageModelAtom,
  searchModeAtom,
} from "@/config/state";
import useAuth from "@/auth/useAuth";
import ChatHistoryDialog from "@/components/ChatHistoryDialog";

import "@/assets/markdown.css";

// messages ids are used to solve the problem of user sends a message and retry sending it again in the active session without reloading the page
let localMessagesIds = [];

function ChatPage() {
  const hasProcessedFirstMessage = useRef(false);

  const { id: chatId } = useParams();
  const { currentUser, setCurrentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentModel, setCurrentModel] = useAtom(currentModelAtom);
  const currentImageModel = useAtomValue(currentImageModelAtom);
  const [, setShowHintAlertModal] = useAtom(showHintAlertModalAtom);
  const [, setHasTitleReachLimitPricingSheet] = useAtom(
    hasTitleReachLimitPricingSheetAtom
  );
  const isThinkingMode = useAtomValue(isThinkingModeAtom);
  const setSearchMode = useSetAtom(searchModeAtom);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentGPT, setCurrentGPT] = useState(location.state?.gpt || null);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const getMessagesIds = () => messages.map((msg) => msg.id);

  useEffect(() => {
    if (chatId) loadMessages();
  }, [chatId]);

  useEffect(() => {
    localMessagesIds = getMessagesIds();
  }, [messages]);

  const loadMessages = async () => {
    setIsLoadingMessages(true);

    const { data, ok } = await apiClient.get(`/chats/${chatId}/messages`);
    setIsLoadingMessages(false);

    if (data?.lastUsedModel) {
      setCurrentModel({
        slug: data.lastUsedModel?.slug,
        provider: data.lastUsedModel?.provider,
        name: data.lastUsedModel?.name,
        price: data.lastUsedModel?.price,
      });
    }
    if (!ok) return toast.error(data?.message || "خطا در بارگذاری پیام‌ها");

    setMessages(data.messages || []);
    setCurrentGPT(data.gpt || null);

    // Check if we have a first message from HomePage
    if (location.state?.firstMessage && !hasProcessedFirstMessage.current) {
      hasProcessedFirstMessage.current = true;

      // Check if this is an image generation request
      if (location.state.firstImageGeneration?.isImageGeneration) {
        // Set search mode to image so it persists for future messages
        setSearchMode("image");
        generateImageInChat(
          location.state.firstMessage,
          location.state.firstImageGeneration.imageModel
        );
      } else {
        sendMessage({
          message: location.state.firstMessage,
          images: location.state.firstImages || [],
          files: location.state.firstFiles || [],
          withWebSearch: location.state.firstWithWebSearch || false,
        });
      }

      location.state = {};
      navigate(location.pathname, { replace: true });
    }
  };

  const sendMessage = async ({
    message = "",
    retryMessageIndex = null,
    withWebSearch = false,
    images = [],
    files = [],
  }) => {
    if (
      !message.trim() &&
      images.length === 0 &&
      files.length === 0 &&
      retryMessageIndex === null
    )
      return;

    // check if user has enough credits with the model price and currentUser credits
    console.log({
      userCredits: currentUser?.credits,
      modelPrice: currentGPT ? 15 : currentModel.price || 0,
    })
    if (currentUser?.credits < (currentGPT ? 15 : currentModel.price || 0)) {
      setShowHintAlertModal(true);
      setHasTitleReachLimitPricingSheet(true);
      return;
    }

    // Trigger scroll to bottom when sending a message
    setScrollTrigger((prev) => prev + 1);
    setIsSendingMessage(true);

    let newMessages = [...messages];
    let retryMessageId = null;
    let tempUserMessageId = null;

    if (retryMessageIndex !== null) {
      // When retrying, slice messages up to and including the message being retried
      newMessages = newMessages.slice(0, retryMessageIndex + 1);
      retryMessageId = newMessages[retryMessageIndex].id;
    } else {
      tempUserMessageId = `temp-${Date.now()}`;
      newMessages.push({
        id: tempUserMessageId,
        from: "user",
        content: message,
        attachments: [
          ...images.map((img) => ({
            type: "image",
            name: img.fileName || img.name,
            // Handle both uploaded images (with url) and raw File objects
            url: img.url || URL.createObjectURL(img),
          })),
          ...files.map((file) => ({
            type: "file",
            url: URL.createObjectURL(file),
            name: file.name,
          })),
        ],
        withWebSearch,
      });
    }

    setMessages(newMessages);

    // Create placeholder for AI response
    const aiMessageId = `temp-ai-${Date.now()}`;
    const aiMessage = {
      id: aiMessageId,
      from: "assistant",
      content: "",
      attachments: [],
      model: currentGPT ? "Gemini 2.5 Pro" : currentModel.name,
    };
    setMessages((prev) => [...prev, aiMessage]);

    setIsStreaming(true);
    setIsSendingMessage(false);

    const model = currentGPT ? "gemini-2.5-pro" : currentModel.slug;
    // Stream the response
    const { data, ok } = await streamMessage(
      `/chats/${chatId}/messages`,
      {
        message,
        images,
        files,
        retryMessageId,
        withWebSearch,
        model,
        isThinkingMode: isThinkingMode,
      },
      (chunk, fullText) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: fullText } : msg
          )
        );
      },
      aiMessageId,
      tempUserMessageId
    );

    setIsStreaming(false);

    if (data?.credits?.remaining !== undefined) {
      setCurrentUser((prevUser) => {
        return {
          ...prevUser,
          credits: data?.credits?.remaining,
        };
      });
    }

    if (!ok) {
      if (
        data?.message === "اعتبار کافی نمی باشد" ||
        data?.message === "Required credits not found"
      ) {
        setShowHintAlertModal(true);
        setHasTitleReachLimitPricingSheet(true);
        setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
        return;
      }

      toast.error(data?.message || "خطا در ارسال پیام");
      setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
      return;
    }
  };

  const generateImageInChat = async (prompt, imageModel) => {
    if (!prompt.trim()) return;

    // Trigger scroll to bottom
    setScrollTrigger((prev) => prev + 1);
    setIsGeneratingImage(true);

    // Create temp user message
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const userMessage = {
      id: tempUserMessageId,
      from: "user",
      content: prompt,
      attachments: [],
    };

    // Create temp assistant message with loading state
    const tempAiMessageId = `temp-ai-${Date.now()}`;
    const aiMessage = {
      id: tempAiMessageId,
      from: "assistant",
      content: "",
      attachments: [],
      model: imageModel?.name || "Image Generation",
      isGeneratingImage: true,
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);

    // Call image generation API with hardcoded settings
    const { data, ok } = await apiClient.post("/images/generate", {
      modelSlug: imageModel?.slug || currentImageModel.slug,
      prompt: prompt.trim(),
      config: {
        aspectRatio: "1:1",
        style: "auto",
        generationCount: 1,
      },
    });

    if (!ok) {
      setIsGeneratingImage(false);
      // Remove the temp messages
      setMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== tempUserMessageId && msg.id !== tempAiMessageId
        )
      );

      if (
        data?.message === "اعتبار کافی نمی باشد" ||
        data?.message === "Required credits not found"
      ) {
        setShowHintAlertModal(true);
        setHasTitleReachLimitPricingSheet(true);
        return;
      }

      toast.error(data?.message || "خطا در تولید تصویر");
      return;
    }

    // Get the generated image URL
    const generatedImage = data.generation?.images?.[0];
    if (!generatedImage?.s3Url) {
      setIsGeneratingImage(false);
      setMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== tempUserMessageId && msg.id !== tempAiMessageId
        )
      );
      toast.error("تصویر تولید نشد");
      return;
    }

    // Update user credits
    if (data?.generation?.remaining !== undefined) {
      setCurrentUser((prevUser) => {
        const prevCredits = prevUser?.credits;
        const prevCreditsObj =
          typeof prevCredits === "number"
            ? { remaining: prevCredits }
            : prevCredits || {};

        return {
          ...prevUser,
          credits: {
            ...prevCreditsObj,
            remaining: data.generation.remaining,
          },
        };
      });
    }

    // Save messages to database
    const { data: saveData, ok: saveOk } = await apiClient.post(
      `/chats/${chatId}/image-generation`,
      {
        prompt: prompt.trim(),
        imageUrl: generatedImage.s3Url,
        imageName: `generated-${Date.now()}.png`,
        model: imageModel?.name || currentImageModel.name,
      }
    );

    setIsGeneratingImage(false);

    if (!saveOk) {
      // Even if save fails, still show the image (it just won't persist)
      console.error("Failed to save image messages:", saveData);
    }

    // Update messages with real IDs and image
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === tempUserMessageId) {
          return {
            ...msg,
            id: saveData?.userMessageId || tempUserMessageId,
          };
        }
        if (msg.id === tempAiMessageId) {
          return {
            ...msg,
            id: saveData?.assistantMessageId || tempAiMessageId,
            content: "",
            attachments: [
              {
                type: "image",
                url: generatedImage.s3Url,
                name: `generated-${Date.now()}.png`,
              },
            ],
            isGeneratingImage: false,
          };
        }
        return msg;
      })
    );
  };

  const streamMessage = async (
    url,
    {
      message,
      withWebSearch = false,
      images = [],
      files = [],
      retryMessageId = null,
      isThinkingMode = false,
      model,
    },
    onChunk,
    tempAiMessageId,
    tempUserMessageId
  ) => {
    const formData = new FormData();

    formData.append("message", message);
    formData.append("model", model);
    formData.append("withWebSearch", withWebSearch);
    formData.append("isCharacter", currentGPT ? true : false);

    if (retryMessageId) formData.append("retryMessageId", retryMessageId);

    formData.append("images", JSON.stringify(images));
    // images.forEach((img) => formData.append("images", img));
    files.forEach((file) => formData.append("files", file));

    if (isThinkingMode) formData.append("isThinkingMode", true);
    else formData.append("isThinkingMode", false);

    const token = authStorage.getToken();
    const headers = {
      "x-auth-token": token,
    };

    const response = await fetch(
      `${import.meta.env.VITE_WEBSITE_URL}/api${url}`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const data = await response.json();
      return { ok: false, data, status: response.status };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let credits = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          const parsedData = JSON.parse(data);
          if (parsedData.content) {
            fullText += parsedData.content;
            onChunk(parsedData.content, fullText);
          }

          if (parsedData.credits) credits = parsedData.credits;
          if (parsedData.newMessageId && tempUserMessageId) {
            // Replace temp user message with real message ID
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempUserMessageId
                  ? { ...msg, id: parsedData.newMessageId }
                  : msg
              )
            );
          }
          if (parsedData.newAiMessageId) {
            // Replace temp AI message with real message ID
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAiMessageId
                  ? { ...msg, id: parsedData.newAiMessageId }
                  : msg
              )
            );
          }
        }
      }
    }

    return { ok: true, data: { content: fullText, credits }, status: 200 };
  };

  return (
    <>
      <AiActions
        messages={messages}
        isLoading={isLoadingMessages}
        isStreaming={isStreaming}
        onRetry={(retryMessageIndex) => sendMessage({ retryMessageIndex })}
        onMessagesUpdate={setMessages}
        gpt={currentGPT}
        messagesIds={getMessagesIds()}
        scrollTrigger={scrollTrigger}
      />

      <AIInputWithSearch
        onSubmit={(
          message,
          withWebSearch,
          selectedImages,
          selectedFiles,
          options
        ) => {
          if (options?.isImageGeneration) {
            // Handle image generation
            generateImageInChat(message, options.imageModel);
          } else {
            // Regular chat message
            sendMessage({
              message,
              images: selectedImages,
              files: selectedFiles,
              withWebSearch,
            });
          }
        }}
        disabled={isSendingMessage || isStreaming || isGeneratingImage}
        isStreaming={isStreaming}
        gpt={currentGPT}
        setIsHistoryOpen={setIsHistoryOpen}
      />
      <ChatHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />
    </>
  );
}

export default ChatPage;
