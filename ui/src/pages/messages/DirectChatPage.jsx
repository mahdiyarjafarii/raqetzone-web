import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRightIcon, SendIcon, MoreVerticalIcon, Trash2Icon, BanIcon } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { connectSocket } from "@/lib/socket";
import useAuth from "@/auth/useAuth";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.VITE_WEBSITE_URL ?? "http://localhost:3000";

function buildAvatar(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${BASE}/uploads/user/${image}`;
}

function formatTime(dateStr) {
  try {
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateStr));
  } catch { return ""; }
}

export default function DirectChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    let alive = true;
    apiClient.get(`/dm/conversations/${conversationId}/messages`).then(({ ok, data }) => {
      if (!alive) return;
      if (ok) {
        setMessages(data.messages ?? []);
        setOtherUser(data.otherUser ?? null);
      }
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
    });
    apiClient.patch(`/dm/conversations/${conversationId}/read`);
    return () => { alive = false; };
  }, [conversationId]);

  useEffect(() => {
    const socket = connectSocket();
    const handler = (payload) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, payload.message]);
      apiClient.patch(`/dm/conversations/${conversationId}/read`);
      setTimeout(() => scrollToBottom(), 50);
    };
    socket.on("new_message", handler);
    return () => socket.off("new_message", handler);
  }, [conversationId]);

  useEffect(() => {
    const socket = connectSocket();
    const handler = (payload) => {
      if (payload.userId !== otherUser?.id) return;
      setOtherUser((prev) => prev ? { ...prev, isOnline: payload.isOnline } : prev);
    };
    socket.on("presence_changed", handler);
    return () => socket.off("presence_changed", handler);
  }, [otherUser?.id]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      const otherId = messages.find((m) => m.senderId !== currentUser?.id)?.senderId;
      if (otherId && !otherUser) {
        apiClient.get(`/profile/${otherId}`).then(({ ok, data }) => {
          if (ok) setOtherUser(data.user);
        });
      }
    }
  }, [loading, messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");

    const optimistic = {
      id: `tmp-${Date.now()}`,
      senderId: currentUser?.id,
      content,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(), 50);

    const { ok, data } = await apiClient.post(`/dm/conversations/${conversationId}/messages`, { content });
    if (ok) {
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? data.message : m));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const deleteConversation = async () => {
    if (deleting) return;
    const confirmed = window.confirm("این گفتگو برای هر دو طرف حذف می‌شود. مطمئنی؟");
    if (!confirmed) return;
    setDeleting(true);
    const { ok } = await apiClient.delete(`/dm/conversations/${conversationId}`);
    setDeleting(false);
    if (ok) navigate("/messages", { replace: true });
  };

  const avatar = buildAvatar(otherUser?.image);
  const initial = otherUser?.name?.[0]?.toUpperCase() ?? "؟";
  const isOnline = Boolean(otherUser?.isOnline);

  return (
    <div className="flex flex-col h-[100dvh] -mx-2 bg-[#f6f2ec] dark:bg-background overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-black/[0.06] dark:border-border bg-white/90 dark:bg-card/90 backdrop-blur-xl shrink-0 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/10 flex items-center justify-center active:scale-95 transition-transform">
          <ChevronRightIcon className="w-5 h-5" />
        </button>
        <div className="relative w-11 h-11 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-background">
          {avatar
            ? <img src={avatar} alt="" className="w-full h-full object-cover" />
            : <span className="font-bold text-primary">{initial}</span>
          }
          {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-card" />}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-black text-base text-foreground truncate">{otherUser?.name ?? "کاربر"}</p>
          <p className={cn("text-[11px] font-medium", isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
            {isOnline ? "آنلاین" : "آفلاین"}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <MoreVerticalIcon className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-12 z-30 w-48 rounded-2xl border border-black/[0.06] dark:border-border bg-white dark:bg-card p-2 shadow-xl text-right">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  deleteConversation();
                }}
                disabled={deleting}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                <Trash2Icon className="w-4 h-4" />
                پاک کردن چت
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  window.alert("مسدود کردن کاربر هنوز در بک‌اند آماده نشده است.");
                }}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-foreground hover:bg-muted"
              >
                <BanIcon className="w-4 h-4" />
                مسدود کردن کاربر
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2 bg-[radial-gradient(circle_at_top,_rgba(239,24,113,0.08),_transparent_35%)]">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn("h-10 rounded-2xl bg-muted animate-pulse w-48", i % 2 === 0 ? "ml-auto" : "")} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm bg-white/80 dark:bg-card/80 px-5 py-3 rounded-full shadow-sm">اولین پیام رو بفرست!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUser?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn("flex", isMine ? "justify-end" : "justify-start")}
                >
                  <div className={cn(
                    "max-w-[78%] rounded-[22px] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                    isMine
                      ? "bg-[#ef1871] text-white rounded-br-md shadow-pink-500/20"
                      : "bg-white dark:bg-card border border-black/[0.06] dark:border-border text-foreground rounded-bl-md"
                  )}>
                    <p>{msg.content}</p>
                    <p className={cn("text-[10px] mt-1 text-right", isMine ? "text-white/70" : "text-muted-foreground")}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-black/[0.06] dark:border-border bg-white/90 dark:bg-card/90 backdrop-blur-xl">
        <div className="flex items-end gap-2 rounded-[28px] bg-[#f3f1ed] dark:bg-muted p-1.5">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="پیام بنویس..."
            className="flex-1 bg-transparent rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-32 leading-relaxed"
            style={{ overflowY: "auto" }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all",
              text.trim() && !sending
                ? "bg-[#ef1871] text-white shadow-lg shadow-pink-500/30 active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
