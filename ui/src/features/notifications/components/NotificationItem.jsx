import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Trash2Icon, TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CONFIG = {
  SYSTEM:    { emoji: "📢", bg: "bg-blue-500/10",   dot: "bg-blue-500"    },
  PROMOTION: { emoji: "🎁", bg: "bg-violet-500/10", dot: "bg-violet-500"  },
  MATCH:     { emoji: "⚔️", bg: "bg-emerald-500/10",dot: "bg-emerald-500" },
  BOOKING:   { emoji: "📅", bg: "bg-amber-500/10",  dot: "bg-amber-500"   },
  ADMIN:     { emoji: "🔔", bg: "bg-red-500/10",    dot: "bg-red-500"     },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return "همین الان";
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400)return `${Math.floor(diff / 3600)} ساعت پیش`;
  return `${Math.floor(diff / 86400)} روز پیش`;
}

export default function NotificationItem({ notification: n, onRead, onDelete, compact = false }) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;

  const inner = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      onClick={() => !n.isRead && onRead?.(n.id)}
      className={cn(
        "relative flex gap-3 rounded-2xl border transition-colors cursor-pointer group",
        compact ? "p-3" : "p-3.5",
        n.isRead
          ? "bg-card border-border"
          : "bg-primary/5 border-primary/20",
        n.isPinned && !n.isRead && "border-primary/30"
      )}
    >
      {/* Pinned stripe */}
      {n.isPinned && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div className={cn(compact ? "h-9 w-9 text-lg" : "h-10 w-10 text-xl", "rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
        {cfg.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(compact ? "text-[13px]" : "text-sm", "font-black leading-6 text-foreground line-clamp-1")}>
            {n.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {!n.isRead && <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(n.id); }}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 h-7 w-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center"
            >
              <Trash2Icon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {n.message && (
          <p className={cn("text-xs text-muted-foreground mt-0.5 leading-relaxed", compact ? "line-clamp-1" : "line-clamp-2")}>
            {n.message}
          </p>
        )}

        {/* Discount code */}
        {n.metadata?.discountCode && (
          <div className="mt-2 flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl px-2.5 py-1.5 w-fit max-w-full">
            <TagIcon className="w-3 h-3 text-primary" />
            <span className="text-primary font-mono font-bold text-xs tracking-wider">
              {n.metadata.discountCode}
            </span>
            {n.metadata.discountPct && <span className="text-primary/70 text-[10px]">{n.metadata.discountPct}% تخفیف</span>}
          </div>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
          {n.metadata?.ctaHref && n.metadata?.ctaLabel && (
            <Link
              to={n.metadata.ctaHref}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-primary font-semibold hover:underline"
            >
              {n.metadata.ctaLabel} ←
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );

  return inner;
}
