import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SectionHeader({ title, emoji, href, className }) {
  return (
    <div className={cn("flex items-center justify-between px-4 mb-3", className)}>
      <h2 className="font-bold text-foreground text-base flex items-center gap-1.5">
        {emoji && <span>{emoji}</span>}
        {title}
      </h2>
      {href && (
        <Link
          to={href}
          className="flex items-center gap-0.5 text-xs text-primary font-medium"
        >
          همه
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
