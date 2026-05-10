import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinIcon, StarIcon, HeartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BADGE_META, SPORT_META } from "@/features/clubs/data/mockClubs";

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

export default function ClubCard({ club, index = 0 }) {
  const [imgError, setImgError] = useState(false);
  const [liked, setLiked] = useState(false);

  // Normalize — API clubs may not have these fields
  const badges      = club.badges ?? [];
  const courts      = club.courts ?? [];
  const sportTypes  = club.sportTypes ?? [];
  const rating      = club.rating ?? null;
  const reviewCount = club.reviewCount ?? null;
  const priceFrom   = club.priceFrom ?? (courts[0]?.pricePerHour ?? null);
  const rawCover    = club.coverImage ?? (club.images?.[0] ?? null);
  const coverImage  = rawCover
    ? rawCover.startsWith("http") ? rawCover : `${import.meta.env.VITE_API_URL?.replace("/api","") ?? "http://localhost:3000"}${rawCover}`
    : null;
  const location    = club.location ?? club.address ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Link to={`/clubs/${club.id}`} className="block">
        <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-sm active:scale-[0.99] transition-transform">
          {/* ── Cover Image ── */}
          <div className="relative h-52 bg-muted overflow-hidden">
            {coverImage && !imgError ? (
              <img
                src={coverImage}
                alt={club.name}
                className="w-full h-full object-cover transition-transform duration-300"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-5xl">🏟️</span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

            {/* Favorite button */}
            <button
              onClick={(e) => { e.preventDefault(); setLiked((v) => !v); }}
              className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
            >
              <HeartIcon
                className={cn("w-4 h-4 transition-colors", liked ? "fill-red-500 text-red-500" : "text-white")}
              />
            </button>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end">
                {badges.map((badge) => {
                  const meta = BADGE_META[badge];
                  if (!meta) return null;
                  return (
                    <span
                      key={badge}
                      className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", meta.className)}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Price */}
            {priceFrom != null && (
              <div className="absolute bottom-3 right-3">
                <div className="bg-white/95 backdrop-blur rounded-xl px-2.5 py-1.5 shadow-sm">
                  <span className="text-gray-900 font-black text-sm leading-none">
                    از {formatPrice(priceFrom)}
                  </span>
                  <span className="text-gray-500 text-[10px]"> ت/ساعت</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="px-4 py-3">
            {/* Name + Rating */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-foreground text-base leading-snug flex-1">{club.name}</h3>
              {rating != null && (
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-foreground font-bold text-sm">{rating}</span>
                  {reviewCount != null && (
                    <span className="text-muted-foreground text-xs">({reviewCount})</span>
                  )}
                </div>
              )}
            </div>

            {/* Location */}
            {location && (
              <div className="flex items-center gap-1 mt-1.5 text-muted-foreground text-xs">
                <MapPinIcon className="w-3 h-3 shrink-0" />
                <span>{location}</span>
              </div>
            )}

            {/* Sport chips + court count */}
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              {sportTypes.map((sport) => {
                const meta = SPORT_META[sport];
                if (!meta) return null;
                return (
                  <span
                    key={sport}
                    className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full", meta.color)}
                  >
                    {meta.label}
                  </span>
                );
              })}
              {courts.length > 0 && (
                <span className="text-muted-foreground text-xs mr-1">
                  {courts.length} زمین
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
