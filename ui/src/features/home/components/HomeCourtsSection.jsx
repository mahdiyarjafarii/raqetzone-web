import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinIcon, ClockIcon, ArrowRightIcon } from "lucide-react";
import SectionHeader from "./SectionHeader";
import { cn } from "@/lib/utils";

const SPORT_ICONS = { padel: "🏓", tennis: "🎾", squash: "🟡", badminton: "🏸" };
const SPORT_DOT = {
  padel: "bg-emerald-500",
  tennis: "bg-yellow-500",
  squash: "bg-red-500",
  badminton: "bg-blue-500",
};

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

function SkeletonCourt() {
  return <div className="h-16 rounded-2xl bg-muted animate-pulse mx-4" />;
}

export default function HomeCourtsSection({ courts = [], loading }) {
  return (
    <div>
      <SectionHeader title="زمین‌های موجود" emoji="🏟" href="/booking" />

      <div className="space-y-2.5 px-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCourt key={i} />)
        ) : courts.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">زمینی یافت نشد</p>
        ) : (
          courts.slice(0, 5).map((court, i) => (
            <motion.div
              key={court.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link to="/booking">
                <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 active:scale-[0.99] transition-transform shadow-sm">
                  {/* Icon */}
                  <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                    {SPORT_ICONS[court.sportType] ?? "🏅"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", SPORT_DOT[court.sportType] ?? "bg-primary")} />
                      <p className="font-bold text-foreground text-sm truncate">{court.name}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <MapPinIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[100px]">{court.location}</span>
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <ClockIcon className="w-3 h-3 shrink-0" />
                        {court.openTime}–{court.closeTime}
                      </span>
                    </div>
                  </div>

                  {/* Price + arrow */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="text-right">
                      <p className="text-primary font-black text-sm leading-none">
                        {formatPrice(court.pricePerHour)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">ت/ساعت</p>
                    </div>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
