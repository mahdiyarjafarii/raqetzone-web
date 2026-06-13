import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SectionHeader({ title, emoji, href, className, ctaLabel = "همه" }) {
  return (
    <div className={cn("flex items-center justify-between px-4 mb-3.5", className)}>
      <h2 className="font-black text-foreground text-lg flex items-center gap-2 tracking-tight">
        {emoji && <span className="text-base">{emoji}</span>}
        {title}
      </h2>
      {href && (
        <Link
          to={href}
          className="flex items-center gap-0.5 text-xs text-primary font-bold bg-primary/8 px-2.5 py-1.5 rounded-full"
        >
          {ctaLabel}
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
