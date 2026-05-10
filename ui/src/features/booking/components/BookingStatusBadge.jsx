import React from "react";
import { cn } from "@/lib/utils";

const STATUS = {
  pending: { label: "در انتظار تأیید", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  approved: { label: "تأیید شده", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  rejected: { label: "رد شده", className: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "لغو شده", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
};

export default function BookingStatusBadge({ status, size = "sm" }) {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full border font-medium",
        size === "sm" ? "text-xs" : "text-sm px-3 py-1",
        s.className
      )}
    >
      {s.label}
    </span>
  );
}
