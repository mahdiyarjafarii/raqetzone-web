import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { showOnboardingSheetAtom } from "@/config/state";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  ShareIcon,
  HeartIcon,
  MapPinIcon,
  StarIcon,
  ClockIcon,
  CalendarCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClubById, SPORT_META } from "@/features/clubs/data/mockClubs";
import { useClub } from "@/features/clubs/hooks/useClubs";
import ClubGallery from "@/features/clubs/components/ClubGallery";
import ClubAmenities from "@/features/clubs/components/ClubAmenities";
import ClubBookingSheet from "@/features/clubs/components/ClubBookingSheet";
import ClubReviews from "@/features/clubs/components/ClubReviews";
import { Button } from "@/components/ui/button";

const SPORT_ICONS = { padel: "🏓", tennis: "🎾", squash: "🟡", badminton: "🏸" };
const SURFACE_LABEL = { artificial: "چمن مصنوعی", clay: "خاک رس", hard: "سخت", grass: "چمن طبیعی" };
const SURFACE_COLOR = {
  artificial: "bg-emerald-500/10 text-emerald-700",
  clay: "bg-orange-500/10 text-orange-700",
  hard: "bg-blue-500/10 text-blue-700",
  grass: "bg-green-500/10 text-green-700",
};

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  );
}

function CourtRow({ court, index, onBook }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onBook(court)}
      className="w-full flex items-center gap-3 bg-muted/40 rounded-2xl p-3 active:bg-muted transition-colors text-right"
    >
      <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center text-xl shrink-0">
        {SPORT_ICONS[court.sportType] ?? "🏅"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground leading-snug">{court.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {court.surfaceType && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", SURFACE_COLOR[court.surfaceType] ?? "bg-muted text-muted-foreground")}>
              {SURFACE_LABEL[court.surfaceType] ?? court.surfaceType}
            </span>
          )}
          <span className="text-muted-foreground text-[10px] flex items-center gap-0.5">
            <ClockIcon className="w-3 h-3" />
            {court.openTime}–{court.closeTime}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-primary font-black text-sm">{formatPrice(court.pricePerHour)}</p>
        <p className="text-muted-foreground text-[10px]">ت/ساعت</p>
      </div>
      <CalendarCheckIcon className="w-4 h-4 text-primary shrink-0" />
    </motion.button>
  );
}

export default function ClubDetailPage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const onboarding = useAtomValue(showOnboardingSheetAtom);
  const [bookingCourt, setBookingCourt] = useState(null);
  const [reviewStats, setReviewStats] = useState({ average: 0, total: 0 });

  const openBooking = (court = null) => {
    setBookingCourt(court);
    setBookingOpen(true);
  };

  // Try API first, fall back to mock data
  const { club: apiClub, loading: apiLoading } = useClub(clubId);
  const mockClub = getClubById(clubId);
  const club = apiClub ?? mockClub;

  if (apiLoading && !mockClub) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-72 bg-muted animate-pulse" />
        <div className="px-4 pt-5 space-y-3">
          <div className="h-7 bg-muted rounded-xl animate-pulse w-2/3" />
          <div className="h-4 bg-muted rounded-xl animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🏟️</span>
        <p className="text-muted-foreground text-center">مجموعه مورد نظر یافت نشد</p>
        <Button onClick={() => navigate("/clubs")} variant="outline" className="rounded-xl">
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Gallery with floating header ── */}
      <div className="relative">
        <ClubGallery images={club.images} clubName={club.name} />

        {/* Floating nav buttons */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={() => navigate("/clubs")}
            className="h-9 w-9 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowRightIcon className="w-4 h-4 text-gray-800" />
          </button>
        </div>

        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            onClick={() => setLiked((v) => !v)}
            className="h-9 w-9 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center active:scale-90 transition-transform"
          >
            <HeartIcon className={cn("w-4 h-4 transition-colors", liked ? "fill-red-500 text-red-500" : "text-gray-600")} />
          </button>
          <button className="h-9 w-9 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center active:scale-90 transition-transform">
            <ShareIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Rating badge on gallery */}
        {reviewStats.total > 0 && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-white font-black text-sm">{reviewStats.average}</span>
            <span className="text-white/60 text-xs">({reviewStats.total})</span>
          </div>
        )}
      </div>

      {/* ── Club info ── */}
      <div className="px-4 pt-5 pb-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Name + Rating */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-xl font-black text-foreground leading-snug flex-1">{club.name}</h1>
            {reviewStats.total > 0 && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <StarRating rating={reviewStats.average} />
                  <span className="font-black text-foreground text-sm">{reviewStats.average}</span>
                </div>
                <p className="text-muted-foreground text-[10px] text-left">{reviewStats.total} نظر</p>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-3">
            <MapPinIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{club.address}</span>
          </div>

          {/* Sport type + Hours */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {club.sportTypes.map((sport) => {
              const meta = SPORT_META[sport];
              return meta ? (
                <span key={sport} className={cn("text-xs font-semibold px-3 py-1 rounded-full", meta.color)}>
                  {meta.label}
                </span>
              ) : null;
            })}
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <ClockIcon className="w-3.5 h-3.5" />
              {club.openTime} – {club.closeTime}
            </span>
          </div>

          {/* Price from */}
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3 mb-5">
            <CalendarCheckIcon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground text-sm">شروع قیمت از</span>
            <span className="text-primary font-black text-base mr-auto">
              {formatPrice(club.priceFrom)} <span className="text-sm font-medium">تومان/ساعت</span>
            </span>
          </div>
        </motion.div>

        {/* ── Divider ── */}
        <div className="h-px bg-border mb-5" />

        {/* ── Description ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="font-bold text-foreground text-base mb-2">درباره مجموعه</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{club.description}</p>
        </motion.div>

        <div className="h-px bg-border my-5" />

        {/* ── Amenities ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <ClubAmenities amenities={club.amenities} />
        </motion.div>

        <div className="h-px bg-border my-5" />

        {/* ── Courts ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="font-bold text-foreground text-base mb-3">
            زمین‌های موجود
            <span className="text-muted-foreground font-normal text-sm mr-2">({club.courts.length} زمین)</span>
          </h2>
          <div className="space-y-2.5">
            {club.courts.map((court, i) => (
              <CourtRow key={court.id} court={court} index={i} onBook={openBooking} />
            ))}
          </div>
        </motion.div>

        <div className="h-px bg-border my-5" />

        {/* ── Reviews ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <ClubReviews clubId={clubId} onStatsLoad={setReviewStats} />
        </motion.div>
      </div>

      {/* ── Sticky CTA — hidden while booking or onboarding sheet is open ── */}
      {!bookingOpen && !onboarding && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-bottom">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-muted-foreground">از</p>
              <p className="font-black text-primary text-base leading-none">
                {formatPrice(club.priceFrom)} <span className="text-xs font-medium text-muted-foreground">ت/ساعت</span>
              </p>
            </div>
            <Button
              onClick={() => openBooking(null)}
              className="flex-1 h-12 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20"
            >
              <CalendarCheckIcon className="w-4 h-4 ml-2" />
              شروع رزرو
            </Button>
          </div>
        </div>
      )}

      {/* ── Booking Sheet ── */}
      <ClubBookingSheet
        open={bookingOpen}
        onClose={() => { setBookingOpen(false); setBookingCourt(null); }}
        club={club}
        initialCourt={bookingCourt}
      />
    </div>
  );
}
