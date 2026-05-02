import React from "react";
import { motion } from "framer-motion";
import { FlameIcon, ClockIcon, MapPinIcon, TagIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useCountdown } from "../hooks/useCountdown";
import { cn } from "@/lib/utils";

const SPORT_ICONS = { padel: "🏓", tennis: "🎾", squash: "🟡", badminton: "🏸" };

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

function CountdownBadge({ validUntil }) {
  const { hours, minutes, seconds, expired } = useCountdown(validUntil);

  if (expired) {
    return (
      <span className="text-[10px] text-muted-foreground font-medium">منقضی شد</span>
    );
  }

  const isUrgent = hours === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded-lg",
        isUrgent
          ? "bg-red-500/15 text-red-600 dark:text-red-400"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      <ClockIcon className="w-3 h-3 shrink-0" />
      {hours > 0 && <span>{pad(hours)}:</span>}
      <span>{pad(minutes)}:{pad(seconds)}</span>
    </div>
  );
}

export default function DealCard({ deal, index = 0 }) {
  const originalPrice = deal.court.pricePerHour;
  const discountedPrice = Math.round(originalPrice * (1 - deal.discountPercent / 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="shrink-0 w-64"
    >
      <Link to="/booking">
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
          {/* Hot deal ribbon */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white text-xs font-bold">
              <FlameIcon className="w-3.5 h-3.5" />
              <span>فلش‌دیل</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                {deal.discountPercent}% تخفیف
              </span>
            </div>
            <CountdownBadge validUntil={deal.validUntil} />
          </div>

          <div className="p-3">
            {/* Court info */}
            <div className="flex items-start gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                {SPORT_ICONS[deal.court.sportType] ?? "🏅"}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-sm truncate">{deal.court.name}</p>
                <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{deal.court.location}</span>
                </div>
              </div>
            </div>

            {/* Slot */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 bg-muted px-2.5 py-1.5 rounded-lg">
              <ClockIcon className="w-3 h-3 shrink-0" />
              <span>
                {deal.slotDate.split("-").reverse().join("/")} — {deal.slotStart} تا {deal.slotEnd}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-xs line-through">
                  {formatPrice(originalPrice)}
                </span>
                <div className="flex items-end gap-1">
                  <span className="text-primary font-black text-base">
                    {formatPrice(discountedPrice)}
                  </span>
                  <span className="text-muted-foreground text-xs mb-0.5">تومان</span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl">
                <TagIcon className="w-3 h-3" />
                رزرو کن
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
