import {
  CopyIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useAtomValue } from "jotai";
import { isThinkingModeAtom, isDeepResearchModeAtom } from "@/config/state";

import { Action, Actions } from "@/components/ui/actions";
import {
  Conversation,
  ConversationContent,
} from "@/components/ui/conversation";
import {
  Message,
  MessageContent,
  MessageAttachments,
} from "@/components/ui/message";
import { cn } from "@/lib/utils";
import useAuth from "@/auth/useAuth";
import { Spinner } from "@/components/ui/spinner";
import Markdown from "@/components/Markdown";
import apiClient from "@/lib/apiClient";
import { Badge } from "./badge";
import DeepResearchLoading from "../DeepResearchLoading";

// Component to handle auto-scroll when messages change or streaming starts
const ScrollToBottomTrigger = ({ scrollTrigger }) => {
  const { scrollToBottom } = useStickToBottomContext();

  useEffect(() => {
    if (scrollTrigger > 0) {
      scrollToBottom();
    }
  }, [scrollTrigger, scrollToBottom]);

  return null;
};

const AiActions = ({
  messages = [],
  isLoading = false,
  isStreaming = false,
  onRetry,
  onMessagesUpdate,
  gpt = null,
  messagesIds = [],
  scrollTrigger = 0,
}) => {
  const { getUserImage } = useAuth();
  const isThinkingMode = useAtomValue(isThinkingModeAtom);
  const isDeepResearchMode = useAtomValue(isDeepResearchModeAtom);
  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("متن کپی شد");
    } catch (error) {
      toast.error("خطا در کپی کردن متن");
    }
  };

  const handleReaction = async (idx, reaction) => {
    if (isLoading || isStreaming) return;
    const messageId = messagesIds[idx];

    if (!messageId) return;
    onMessagesUpdate(
      messages.map((msg, i) => (i === idx ? { ...msg, reaction } : msg))
    );

    const { data, ok } = await apiClient.post(`/messages/${messageId}/react`, {
      reaction,
    });

    if (!ok) return toast.error(data?.message || "خطا در ثبت واکنش");
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full max-w-lg justify-center items-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Conversation
      id="chat-ctn"
      className="relative w-full h-[calc(100vh-12rem)]"
    >
      <ConversationContent>
        <ScrollToBottomTrigger scrollTrigger={scrollTrigger} />
        {messages.map((message, idx) => (
          <Message
            className={cn(
              "flex flex-col gap-2",
              message.from === "assistant" ? "items-end" : "items-start"
            )}
            from={message.from}
            key={message.id}
          >
            <div className="flex items-center justify-center">
              {message.from === "assistant" && (
                <>
                  {gpt ? (
                    <Badge variant="primary-light" className="ml-2">
                      <span>{gpt.name}</span>
                    </Badge>
                  ) : (
                    <Badge variant="primary-light" className="ml-2">
                      <span>
                        {message.model === "maya" ? "خودکار" : message.model}
                      </span>
                    </Badge>
                  )}
                </>
              )}
              <img
                src={
                  message.from === "assistant"
                    ? gpt?.image || "/logo.png"
                    : getUserImage()
                }
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            </div>

            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments
                attachments={message.attachments}
                from={message.from}
              />
            )}

            {message.isGeneratingImage ? (
              <MessageContent>
                <div className="flex flex-col justify-center items-center gap-3 w-72 h-72">
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                    <Spinner className="w-4 h-4" />
                    در حال تولید تصویر...
                  </span>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    این فرآیند ممکن است چند لحظه طول بکشد
                  </p>
                </div>
              </MessageContent>
            ) : message.content ? (
              <MessageContent>
                <Markdown>{message.content}</Markdown>
              </MessageContent>
            ) : (
              isStreaming &&
              idx === messages.length - 1 && (
                <MessageContent>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    {isDeepResearchMode ? (
                      <DeepResearchLoading />
                    ) : isThinkingMode ? (
                      <>
                        <Spinner />
                        <span>در حال تفکر ...</span>
                      </>
                    ) : (
                      <>
                        <Spinner />
                        <span>در حال پردازش ...</span>
                      </>
                    )}
                  </span>
                </MessageContent>
              )
            )}

            {message.from === "assistant" &&
              message.content &&
              !message.id?.startsWith("temp-") && (
                <Actions>
                  <Action
                    label="ارسال مجدد"
                    onClick={() => onRetry(idx - 1)}
                    disabled={isLoading || isStreaming}
                  >
                    <RefreshCcwIcon className="size-4" />
                  </Action>

                  <Action
                    label="لایک"
                    onClick={() => handleReaction(idx, "like")}
                    className={cn(
                      message.reaction === "like" && "text-primary"
                    )}
                    disabled={isLoading || isStreaming}
                  >
                    <ThumbsUpIcon
                      className={cn(
                        "size-4",
                        message.reaction === "like" && "fill-current"
                      )}
                    />
                  </Action>

                  <Action
                    label="دیسلایک"
                    onClick={() => handleReaction(idx, "dislike")}
                    className={cn(
                      message.reaction === "dislike" && "text-primary"
                    )}
                    disabled={isLoading || isStreaming}
                  >
                    <ThumbsDownIcon
                      className={cn(
                        "size-4",
                        message.reaction === "dislike" && "fill-current"
                      )}
                    />
                  </Action>

                  <Action
                    label="کپی"
                    onClick={() => handleCopy(message.content)}
                  >
                    <CopyIcon className="size-4" />
                  </Action>
                </Actions>
              )}
          </Message>
        ))}
      </ConversationContent>
    </Conversation>
  );
};

export default AiActions;
