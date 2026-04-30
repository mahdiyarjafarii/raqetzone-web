import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Bot, Sparkles } from "lucide-react";

import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import apiClient from "@/lib/apiClient";

import "@/assets/markdown.css";

function NewChatPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { gpt, initialPrompt } = location.state || {};
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const onSubmit = async (
    message,
    withWebSearch,
    selectedImages,
    selectedFiles,
    options = null
  ) => {
    setIsCreatingChat(true);

    const { data, ok } = await apiClient.post("/chats", {
      gptId: gpt?.id,
    });
    setIsCreatingChat(false);

    if (!ok) return toast.error(data?.message || "خطا در ایجاد چت");

    navigate(`/chat/${data.chat.id}`, {
      state: {
        firstMessage: message,
        firstImages: selectedImages,
        firstFiles: selectedFiles,
        firstWithWebSearch: withWebSearch,
        firstImageGeneration: options?.isImageGeneration ? options : null,
        gpt,
      },
      replace: true
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {gpt && (
        <div className="flex-1 flex items-center justify-center pb-32">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            {/* Character Image */}
            <div className="relative">
              {gpt.image ? (
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-lg shadow-primary/10">
                  <img
                    src={gpt.image}
                    alt={gpt.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 flex items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border-2 border-primary/50 shadow-lg shadow-primary/10">
                  <Bot className="w-16 h-16 text-primary" />
                </div>
              )}
              {/* Sparkle Icon */}
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* Character Name */}
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-foreground">{gpt.name}</h2>
              {gpt.description && (
                <p className="text-sm text-muted-foreground max-w-md">
                  {gpt.description}
                </p>
              )}
            </div>

            {/* Questions Suggestions */}
            {gpt?.questions && gpt.questions.length > 0 && (
              <div className="flex flex-col gap-3 w-full max-w-md">
                <p className="text-sm font-medium text-muted-foreground text-center">
                  می‌توانید گفتگو را با این جملات شروع کنید
                </p>
                <div className="flex flex-col gap-2">
                  {gpt.questions.map((question, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onSubmit(question, false, [], [])}
                      disabled={isCreatingChat}
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent/50 hover:border-primary/30 transition-all text-right text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AIInputWithSearch
        onSubmit={onSubmit}
        disabled={isCreatingChat}
        initialValue={initialPrompt || ""}
        gpt={gpt}
      />
    </div>
  );
}

export default NewChatPage;
