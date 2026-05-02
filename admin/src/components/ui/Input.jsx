import React from "react";
import { cn } from "@/lib/utils";

export default function Input({ className, label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <input
        className={cn(
          "h-9 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors",
          error && "border-destructive focus:ring-destructive/30",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
