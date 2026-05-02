import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCheckIcon, RefreshCwIcon } from "lucide-react";
import { useAtomValue } from "jotai";

import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import NotificationItem from "@/features/notifications/components/NotificationItem";
import { notifLoadingAtom } from "@/features/notifications/store/notificationStore";
import { cn } from "@/lib/utils";

const FILTER_TABS = [
  { value: "all",       label: "همه"       },
  { value: "unread",    label: "نخوانده"   },
  { value: "PROMOTION", label: "آفرها"     },
  { value: "BOOKING",   label: "رزرو"      },
  { value: "MATCH",     label: "بازی"      },
];

function SkeletonItem() {
  return <div className="h-20 rounded-2xl bg-muted animate-pulse" />;
}

export default function NotificationsPage() {
  const [filter, setFilter]     = useState("all");
  const loading                 = useAtomValue(notifLoadingAtom);

  const { notifications, unreadCount, markRead, markAllRead, remove, fetchAll } =
    useNotifications({ poll: false });

  const filtered = notifications.filter((n) => {
    if (filter === "all")    return true;
    if (filter === "unread") return !n.isRead;
    return n.type === filter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">اعلان‌ها</h1>
            {unreadCount > 0 && (
              <p className="text-muted-foreground text-xs mt-0.5">
                {unreadCount} اعلان خوانده‌نشده
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              className="p-1.5 rounded-full bg-muted hover:bg-accent transition-colors"
            >
              <RefreshCwIcon className={cn("w-4 h-4 text-foreground", loading && "animate-spin")} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20"
              >
                <CheckCheckIcon className="w-3.5 h-3.5" />
                همه خوانده شد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "all"    ? notifications.length :
            tab.value === "unread" ? unreadCount :
            notifications.filter((n) => n.type === tab.value).length;

          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0",
                filter === tab.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    filter === tab.value
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="px-4 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonItem key={i} />)
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <span className="text-5xl block mb-4">
              {filter === "unread" ? "✅" : "🔔"}
            </span>
            <p className="text-muted-foreground text-sm font-medium">
              {filter === "unread" ? "همه اعلان‌ها خوانده شدند" : "اعلانی وجود ندارد"}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markRead}
                onDelete={remove}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
