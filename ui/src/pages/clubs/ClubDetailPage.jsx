import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import toast from "react-hot-toast";
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

function CourtRow({ court, index, onBook }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onBook(court)}
      className="w-full flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-right shadow-sm transition-colors active:bg-muted"
    >
      <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
        {SPORT_ICONS[court.sportType] ?? "🏅"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground leading-snug">{court.name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {court.surfaceType && (
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", SURFACE_COLOR[court.surfaceType] ?? "bg-muted text-muted-foreground")}>
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
  const location = useLocation();
  const [liked, setLiked] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const onboarding = useAtomValue(showOnboardingSheetAtom);
  const [bookingCourt, setBookingCourt] = useState(null);
  const [bookingDate, setBookingDate] = useState(null);
  const [bookingSlotStart, setBookingSlotStart] = useState(null);
  const [reviewStats, setReviewStats] = useState({ average: 0, total: 0 });

  const openBooking = (court = null, date = null, slotStart = null) => {
    setBookingCourt(court);
    setBookingDate(date);
    setBookingSlotStart(slotStart);
    setBookingOpen(true);
  };

  const handleShare = async () => {
    const shareData = {
      title: club?.name ?? "رکت زون",
      text: club?.name ? `باشگاه ${club.name} در رکت زون` : "باشگاه در رکت زون",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      toast.success("لینک باشگاه کپی شد");
    } catch (err) {
      if (err?.name !== "AbortError") toast.error("خطا در اشتراک‌گذاری");
    }
  };

  // Try API first, fall back to mock data
  const { club: apiClub, loading: apiLoading } = useClub(clubId);
  const mockClub = getClubById(clubId);
  const club = apiClub ?? mockClub;

  // Auto-open the booking sheet when arriving from a flash deal — pre-select the
  // deal's court and day, then clear the intent so refresh/back doesn't re-open.
  const bookingIntent = location.state?.openBooking ? location.state : null;
  useEffect(() => {
    if (!bookingIntent || !club) return;
    const court = bookingIntent.courtId
      ? club.courts?.find((c) => c.id === bookingIntent.courtId) ?? null
      : null;
    openBooking(court, bookingIntent.slotDate ?? null, bookingIntent.slotStart ?? null);
    navigate(`/clubs/${clubId}`, { replace: true, state: null });
  }, [bookingIntent, club, clubId, navigate]);

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
      <div className="relative">
        <ClubGallery images={club.images} clubName={club.name} />

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={() => navigate("/clubs")}
            className="h-10 w-10 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg shadow-black/10 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowRightIcon className="w-4 h-4 text-gray-800" />
          </button>
        </div>

        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button
            onClick={() => setLiked((v) => !v)}
            className="h-10 w-10 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg shadow-black/10 flex items-center justify-center active:scale-90 transition-transform"
          >
            <HeartIcon className={cn("w-4 h-4 transition-colors", liked ? "fill-red-500 text-red-500" : "text-gray-600")} />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="h-10 w-10 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg shadow-black/10 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ShareIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 pb-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl font-black text-foreground leading-snug flex-1">{club.name}</h1>
            {reviewStats.total > 0 && (
              <div className="shrink-0 rounded-2xl bg-amber-500/10 px-3 py-2 text-right">
                <div className="flex items-center gap-1 justify-end mb-0.5">
                  <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-black text-foreground text-sm">{reviewStats.average}</span>
                </div>
                <p className="text-muted-foreground text-[10px]">{reviewStats.total} نظر</p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-1.5 text-muted-foreground text-sm mb-3">
            <MapPinIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-6">{club.address}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            {club.sportTypes.map((sport) => {
              const meta = SPORT_META[sport];
              return meta ? (
                <span key={sport} className={cn("text-xs font-semibold px-3 py-1 rounded-full", meta.color)}>
                  {meta.label}
                </span>
              ) : null;
            })}
            <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground text-xs font-medium">
              <ClockIcon className="w-3.5 h-3.5" />
              {club.openTime} – {club.closeTime}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3 mb-5">
            <CalendarCheckIcon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground text-sm">شروع قیمت از</span>
            <span className="text-primary font-black text-base mr-auto">
              {formatPrice(club.priceFrom)} <span className="text-sm font-medium">تومان/ساعت</span>
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm"
        >
          <h2 className="font-bold text-foreground text-base mb-2">درباره مجموعه</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{club.description}</p>
        </motion.div>

        {club.amenities?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-4 rounded-3xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <ClubAmenities amenities={club.amenities} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground text-base">زمین‌های موجود</h2>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{club.courts.length} زمین</span>
          </div>
          <div className="space-y-2.5">
            {club.courts.map((court, i) => (
              <CourtRow key={court.id} court={court} index={i} onBook={openBooking} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-5"
        >
          <ClubReviews clubId={clubId} onStatsLoad={setReviewStats} />
        </motion.div>
      </div>

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
        onClose={() => { setBookingOpen(false); setBookingCourt(null); setBookingDate(null); setBookingSlotStart(null); }}
        club={club}
        initialCourt={bookingCourt}
        initialDate={bookingDate}
        initialSlotStart={bookingSlotStart}
      />
    </div>
  );
}
