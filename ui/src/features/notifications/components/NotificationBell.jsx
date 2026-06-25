import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon, CheckCheckIcon, ArrowLeftIcon, InboxIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAtom } from "jotai";

import { notifPanelOpenAtom, unreadCountAtom } from "../store/notificationStore";
import { useNotifications } from "../hooks/useNotifications";
import NotificationItem from "./NotificationItem";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const [open, setOpen]       = useAtom(notifPanelOpenAtom);
  const [unread]              = useAtom(unreadCountAtom);
  const panelRef              = useRef(null);
  const popoverRef            = useRef(null);

  const { notifications, markRead, markAllRead, remove } = useNotifications({ poll: true });
  const preview = notifications.slice(0, 5);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      const clickedTrigger = panelRef.current?.contains(e.target);
      const clickedPopover = popoverRef.current?.contains(e.target);
      if (!clickedTrigger && !clickedPopover) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <motion.button
        id="tour-notification-bell"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.93 }}
        className={cn(
          "relative flex items-center justify-center rounded-full h-9 w-9 transition-all",
          open
            ? "bg-primary/12 text-primary ring-1 ring-primary/25"
            : unread > 0
            ? "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-400/25"
            : "bg-muted text-muted-foreground ring-1 ring-border"
        )}
      >
        <motion.div
          animate={unread > 0 ? { rotate: [0, -18, 18, -10, 10, 0] } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <BellIcon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
        </motion.div>

        {unread > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
        )}
      </motion.button>

      {createPortal((
        <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed left-3 right-3 top-12 z-[2147483647] mx-auto max-w-[380px] overflow-hidden rounded-3xl border border-border/80 bg-background/95 shadow-2xl shadow-black/10 backdrop-blur-xl sm:left-6 sm:right-auto sm:mx-0 sm:w-[360px]"
            style={{ transformOrigin: "top right" }}
          >
            {/* Header */}
            <div className="bg-background/95 px-4 py-3.5 border-b border-border/70 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-base text-foreground">اعلان‌ها</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {unread > 0 ? `${unread} اعلان خوانده‌نشده` : "همه اعلان‌ها خوانده شده‌اند"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="h-8 px-2.5 rounded-xl bg-primary/10 flex items-center gap-1 text-[11px] font-bold text-primary hover:bg-primary/15 transition-colors"
                  >
                    <CheckCheckIcon className="w-3.5 h-3.5" />
                    خواندن همه
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[min(520px,70vh)] overflow-y-auto no-scrollbar p-2.5 space-y-2">
              {preview.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <InboxIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-bold text-sm text-foreground">اعلانی ندارید</p>
                  <p className="text-muted-foreground text-xs mt-1">اینجا پیام‌ها و هدیه‌ها نمایش داده می‌شوند</p>
                </div>
              ) : (
                preview.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onRead={markRead}
                    onDelete={remove}
                    compact
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-background/95 border-t border-border/70 p-2.5">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="h-10 rounded-2xl bg-muted/70 hover:bg-muted flex items-center justify-center gap-1.5 text-xs text-primary font-black w-full transition-colors"
              >
                مشاهده همه اعلان‌ها
                <ArrowLeftIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      ), document.body)}
    </div>
  );
}
