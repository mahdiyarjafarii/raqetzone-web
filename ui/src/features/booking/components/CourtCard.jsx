import React from "react";
import { motion } from "framer-motion";
import { MapPinIcon, ClockIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SPORT_ICONS = {
  padel: "🥎",
  tennis: "🎾",
  squash: "🟡",
  badminton: "🏸",
};

const SURFACE_LABEL = {
  artificial: "چمن مصنوعی",
  clay: "خاک رس",
  hard: "سخت",
  grass: "چمن طبیعی",
};

const SURFACE_COLOR = {
  artificial: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  clay: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  hard: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  grass: "bg-green-500/10 text-green-600 dark:text-green-400",
};

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

export default function CourtCard({ court, onClick, index = 0 }) {
  const sportIcon = SPORT_ICONS[court.sportType] ?? "🏅";
  const surfaceLabel = SURFACE_LABEL[court.surfaceType] ?? court.surfaceType;
  const surfaceColor = SURFACE_COLOR[court.surfaceType] ?? "bg-muted text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:shadow-none transition-shadow">
        {/* Top color strip per sport */}
        <div
          className={cn(
            "h-1.5",
            court.sportType === "padel" && "bg-emerald-500",
            court.sportType === "tennis" && "bg-yellow-500",
            court.sportType === "squash" && "bg-red-500",
            court.sportType === "badminton" && "bg-blue-500",
            !["padel", "tennis", "squash", "badminton"].includes(court.sportType) && "bg-primary"
          )}
        />

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                {sportIcon}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground text-base leading-tight truncate">
                  {court.name}
                </h3>
                <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-xs">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{court.location}</span>
                </div>
              </div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-1 rotate-180" />
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              {court.surfaceType && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", surfaceColor)}>
                  {surfaceLabel}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {court.openTime}–{court.closeTime}
              </span>
            </div>
            <div className="text-right">
              <span className="text-primary font-bold text-sm">
                {formatPrice(court.pricePerHour)}
              </span>
              <span className="text-muted-foreground text-xs"> تومان/ساعت</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
