import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircleIcon, ChevronLeftIcon, SearchIcon } from "lucide-react";
import { useAtom } from "jotai";
import apiClient from "@/lib/apiClient";
import { unreadDmCountAtom } from "@/config/state";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.VITE_WEBSITE_URL ?? "http://localhost:3000";

function buildAvatar(image) {
  if (!image) return null;
  if (image.startsWith("http")) return encodeURI(image);
  const encodedImage = image.split("/").map(encodeURIComponent).join("/");
  return `${BASE}/uploads/user/${encodedImage}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateStr));
  } catch { return ""; }
}

export default function ConversationsPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setUnread] = useAtom(unreadDmCountAtom);

  useEffect(() => {
    apiClient.get("/dm/conversations").then(({ ok, data }) => {
      if (ok) {
        setConversations(data.conversations ?? []);
        const total = (data.conversations ?? []).reduce((s, c) => s + (c.unreadCount ?? 0), 0);
        setUnread(total);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen pb-28">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-foreground">پیام‌ها</h1>
            <p className="text-xs text-muted-foreground mt-1">گفت‌وگوهای مستقیم شما</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ef1871] text-white flex items-center justify-center shadow-lg shadow-pink-500/25">
            <MessageCircleIcon className="w-6 h-6" />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-card px-3 py-3 border border-black/[0.05] dark:border-border shadow-sm">
          <SearchIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">جستجو در پیام‌ها</span>
        </div>
      </div>

      {loading ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 px-8 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircleIcon className="w-10 h-10 text-primary/50" />
          </div>
          <p className="font-bold text-foreground text-lg">هنوز پیامی نداری</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            از پروفایل بازیکن‌ها می‌تونی باهاشون چت کنی
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {conversations.map((conv, i) => {
            const other = conv.otherUser;
            const avatar = buildAvatar(other?.image);
            const initial = other?.name?.[0]?.toUpperCase() ?? "؟";
            return (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-3 bg-white dark:bg-card rounded-[26px] px-4 py-3.5 border border-black/[0.05] dark:border-border shadow-sm active:scale-[0.98] transition-transform text-right overflow-hidden"
              >
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center ring-2 ring-background">
                    {avatar
                      ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                      : <span className="font-bold text-primary text-lg">{initial}</span>
                    }
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#ef1871] text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-card">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-black text-base text-foreground truncate">{other?.name ?? "کاربر"}</p>
                  <p className={cn(
                    "text-sm truncate mt-1",
                    conv.unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}>
                    {conv.lastMessage
                      ? (conv.lastMessage.senderId !== other?.id ? `شما: ${conv.lastMessage.content}` : conv.lastMessage.content)
                      : "مکالمه جدید"
                    }
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={cn("text-[11px]", conv.unreadCount > 0 ? "text-[#ef1871] font-bold" : "text-muted-foreground")}>{timeAgo(conv.lastMessageAt)}</span>
                  <ChevronLeftIcon className="w-4 h-4 text-muted-foreground/40" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
