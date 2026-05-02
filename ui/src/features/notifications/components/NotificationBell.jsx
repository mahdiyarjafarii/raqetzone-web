import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon, CheckCheckIcon, ArrowLeftIcon } from "lucide-react";
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

  const { notifications, markRead, markAllRead, remove } = useNotifications({ poll: true });
  const preview = notifications.slice(0, 5);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative h-8 w-8 rounded-full flex items-center justify-center transition-colors",
          open ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
        )}
      >
        <motion.div animate={unread > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}} transition={{ duration: 0.5 }}>
          <BellIcon className="w-5 h-5" />
        </motion.div>

        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 top-10 w-80 max-h-[70vh] overflow-y-auto no-scrollbar rounded-2xl border border-border bg-background shadow-xl z-50"
            style={{ transformOrigin: "top right" }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">اعلان‌ها</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    <CheckCheckIcon className="w-3.5 h-3.5" />
                    همه خوانده شد
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="p-2 space-y-1.5">
              {preview.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-3xl block mb-2">🔔</span>
                  <p className="text-muted-foreground text-xs">اعلانی ندارید</p>
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
            {notifications.length > 5 && (
              <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-2.5">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-xs text-primary font-semibold w-full"
                >
                  مشاهده همه اعلان‌ها
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
