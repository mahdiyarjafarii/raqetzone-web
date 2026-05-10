import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinIcon, StarIcon, ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionHeader from "./SectionHeader";
import { useClubs } from "@/features/clubs/hooks/useClubs";

const SPORT_LABELS = { padel: "پادل", tennis: "تنیس", squash: "اسکواش", badminton: "بدمینتون" };
const BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";
const imgUrl = (src) => !src ? null : src.startsWith("http") ? src : `${BASE}${src}`;
const SPORT_COLORS = {
  padel: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  tennis: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  squash: "bg-red-500/15 text-red-700 dark:text-red-400",
  badminton: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

function ClubCardHome({ club, index }) {
  const [imgError, setImgError] = React.useState(false);
  const cover = imgUrl(club.coverImage ?? club.images?.[0]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <Link to={`/clubs/${club.id}`}>
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl overflow-hidden shadow-sm active:scale-[0.99] transition-transform">
          {/* Thumbnail */}
          <div className="w-20 h-20 shrink-0 relative overflow-hidden bg-muted">
            {cover && !imgError ? (
              <img
                src={cover}
                alt={club.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-2xl">🏟️</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-3 pr-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-foreground text-sm leading-snug truncate">{club.name}</p>
              <div className="flex items-center gap-0.5 shrink-0">
                <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-foreground">{club.rating}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-xs">
              <MapPinIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{club.location}</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1 flex-wrap">
                {club.sportTypes.slice(0, 2).map((sport) => (
                  <span key={sport} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", SPORT_COLORS[sport] ?? "bg-muted text-muted-foreground")}>
                    {SPORT_LABELS[sport] ?? sport}
                  </span>
                ))}
              </div>
              <div className="text-right shrink-0">
                <span className="text-primary font-black text-xs">{formatPrice(club.priceFrom)}</span>
                <span className="text-muted-foreground text-[10px]"> ت</span>
              </div>
            </div>
          </div>

          <div className="px-3">
            <ArrowLeftIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomeCourtsSection({ courts = [], loading: homeLoading }) {
  const { clubs: apiClubs, loading: clubsLoading } = useClubs();
  const loading = homeLoading || clubsLoading;
  const clubs = apiClubs.slice(0, 4);

  return (
    <div>
      <SectionHeader title="مجموعه‌های ورزشی" emoji="🏟" href="/clubs" />

      <div className="space-y-2.5 px-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : (
          clubs.map((club, i) => (
            <ClubCardHome key={club.id} club={club} index={i} />
          ))
        )}

        {/* See all link */}
        <Link
          to="/clubs"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed border-border text-muted-foreground text-sm font-medium active:bg-muted transition-colors"
        >
          مشاهده همه مجموعه‌ها
          <ArrowLeftIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
