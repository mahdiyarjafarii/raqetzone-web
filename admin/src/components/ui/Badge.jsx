import React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default:    "bg-primary/10 text-primary border-primary/20",
  success:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning:    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  destructive:"bg-destructive/10 text-destructive border-destructive/20",
  muted:      "bg-muted text-muted-foreground border-border",
};

export default function Badge({ children, variant="default", className }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
