import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinIcon, StarIcon, HeartIcon, ClockIcon, ChevronLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BADGE_META, SPORT_META } from "@/features/clubs/data/mockClubs";

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

const BADGE_ICON = {
  popular:        "🔥",
  top_rated:      "⭐",
  available_today:"✅",
  new:            "✨",
};

export default function ClubCard({ club, index = 0 }) {
  const [imgError, setImgError] = useState(false);
  const [liked, setLiked]       = useState(false);

  const badges      = club.badges ?? [];
  const courts      = club.courts ?? [];
  const sportTypes  = club.sportTypes ?? [];
  const rating      = club.rating ?? null;
  const reviewCount = club.reviewCount ?? null;
  const priceFrom   = club.priceFrom ?? (courts[0]?.pricePerHour ?? null);
  const rawCover    = club.coverImage ?? (club.images?.[0] ?? null);
  const coverImage  = rawCover
    ? rawCover.startsWith("http")
      ? rawCover
      : `${import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000"}${rawCover}`
    : null;
  const location = club.location ?? club.address ?? "";
  const openTime = club.openTime;
  const closeTime = club.closeTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 280, damping: 24 }}
      whileTap={{ scale: 0.985 }}
    >
      <Link to={`/clubs/${club.id}`} className="block">
        <div className="rounded-3xl overflow-hidden bg-card border border-border/70 shadow-sm shadow-black/5">

          {/* ── Cover image ── */}
          <div className="relative h-48 bg-muted overflow-hidden">
            {coverImage && !imgError ? (
              <img
                src={coverImage}
                alt={club.name}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-6xl">🏟️</span>
              </div>
            )}

            {/* Dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

            {/* Favorite */}
            <button
              onClick={(e) => { e.preventDefault(); setLiked((v) => !v); }}
              className="absolute top-3 left-3 h-9 w-9 rounded-2xl bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
            >
              <HeartIcon className={cn("w-4 h-4 transition-colors", liked ? "fill-red-400 text-red-400" : "text-white")} />
            </button>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end">
                {badges.slice(0, 2).map((badge) => {
                  const meta = BADGE_META[badge];
                  if (!meta) return null;
                  return (
                    <span
                      key={badge}
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1",
                        meta.className
                      )}
                    >
                      <span>{BADGE_ICON[badge]}</span>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Bottom row inside image: rating + price */}
            <div className="absolute bottom-0 inset-x-0 px-3 pb-3 flex items-end justify-between">
              {/* Rating */}
              {rating != null && (
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-xl px-2.5 py-1.5">
                  <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-white font-black text-sm leading-none">{rating}</span>
                  {reviewCount != null && (
                    <span className="text-white/60 text-[10px]">({reviewCount})</span>
                  )}
                </div>
              )}

              {/* Price */}
              {priceFrom != null && (
                <div className="bg-white/95 backdrop-blur rounded-xl px-3 py-1.5 shadow-sm">
                  <span className="text-gray-900 font-black text-sm leading-none">
                    از {formatPrice(priceFrom)}
                  </span>
                  <span className="text-gray-500 text-[10px]"> ت/ساعت</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Info ── */}
          <div className="px-4 pt-3.5 pb-3">
            {/* Name + chevron */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="font-black text-foreground text-base leading-snug flex-1">{club.name}</h3>
              <ChevronLeftIcon className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1" />
            </div>

            {/* Location */}
            {location && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2.5">
                <MapPinIcon className="w-3 h-3 shrink-0 text-primary/70" />
                <span className="truncate">{location}</span>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-border/60 mb-2.5" />

            {/* Sport chips + hours + court count */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                {sportTypes.map((sport) => {
                  const meta = SPORT_META[sport];
                  if (!meta) return null;
                  return (
                    <span
                      key={sport}
                      className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-full", meta.color)}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>

              <div className="flex items-center gap-2.5 shrink-0 text-muted-foreground">
                {openTime && closeTime && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <ClockIcon className="w-3 h-3" />
                    {openTime}–{closeTime}
                  </span>
                )}
                {courts.length > 0 && (
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {courts.length} زمین
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
