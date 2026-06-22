import React from "react";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ErrorState({
  message = "خطا در بارگذاری اطلاعات",
  onRetry,
  className = "",
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 gap-4 text-center", className)}>
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircleIcon className="w-7 h-7 text-destructive" />
      </div>
      <div>
        <h3 className="font-bold text-foreground mb-1">مشکلی پیش آمد</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCwIcon className="w-4 h-4" />
          تلاش مجدد
        </button>
      )}
    </div>
  );
}
