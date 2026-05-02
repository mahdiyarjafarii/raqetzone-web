import React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default:   "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:   "border border-border bg-background hover:bg-muted text-foreground",
  ghost:     "hover:bg-muted text-foreground",
  destructive:"bg-destructive text-white hover:bg-destructive/90",
};
const sizes = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-9 px-4 text-sm rounded-xl gap-2",
  lg: "h-10 px-5 text-sm rounded-xl gap-2",
  icon: "h-8 w-8 rounded-lg",
};

export default function Button({ children, variant="default", size="md", className, disabled, ...props }) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0",
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
