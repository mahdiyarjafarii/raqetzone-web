import React from "react";
import { motion } from "framer-motion";
import { FlameIcon, ClockIcon, MapPinIcon, TagIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCountdown } from "../hooks/useCountdown";
import { cn } from "@/lib/utils";

const SPORT_ICONS = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

function formatDateFa(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString("fa-IR-u-ca-persian", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeFa(time) {
  return time.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function getSlotDurationHours(startTime, endTime) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function CountdownBadge({ validUntil }) {
  const { hours, minutes, seconds, expired } = useCountdown(validUntil);

  // The badge sits on a vivid red→orange ribbon, so it needs a solid,
  // high-contrast surface to stay legible — a frosted white pill.
  if (expired) {
    return (
      <span className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-red-600 shadow-sm">
        منقضی شد
      </span>
    );
  }

  const isUrgent = hours === 0;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-white/95 px-2 py-1 shadow-sm">
      {/* live pulse — red when under an hour, amber otherwise */}
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {isUrgent && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            isUrgent ? "bg-red-500" : "bg-amber-500"
          )}
        />
      </span>
      <span
        className={cn(
          "font-mono text-[11px] font-extrabold leading-none tabular-nums tracking-tight",
          isUrgent ? "text-red-600" : "text-amber-700"
        )}
      >
        {hours > 0 && `${pad(hours)}:`}{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}

export default function DealCard({ deal, index = 0 }) {
  const navigate = useNavigate();
  const durationHours = getSlotDurationHours(deal.slotStart, deal.slotEnd);
  const originalPrice = Math.round(deal.court.pricePerHour * durationHours);
  const discountedPrice = Math.round(originalPrice * (1 - deal.discountPercent / 100));

  // Take the user straight to this court's booking flow, pre-set to the deal's
  // day. Fall back to the clubs list only if the court isn't linked to a club.
  const handleReserve = () => {
    if (deal.court.clubId) {
      navigate(`/clubs/${deal.court.clubId}`, {
        state: {
          openBooking: true,
          courtId: deal.court.id,
          slotDate: deal.slotDate,
          slotStart: deal.slotStart,
        },
      });
    } else {
      navigate("/clubs");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="shrink-0 w-64"
    >
      <button type="button" onClick={handleReserve} className="block w-full text-right">
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
                {formatDateFa(deal.slotDate)} — <span dir="ltr">{formatTimeFa(deal.slotStart)} تا {formatTimeFa(deal.slotEnd)}</span>
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
      </button>
    </motion.div>
  );
}
