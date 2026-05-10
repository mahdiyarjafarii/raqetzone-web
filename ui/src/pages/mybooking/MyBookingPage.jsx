import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  XCircleIcon,
  RefreshCwIcon,
  Building2Icon,
  PhoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { bookingService } from "@/features/booking/services/bookingService";
import BookingStatusBadge from "@/features/booking/components/BookingStatusBadge";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDateFa(dateStr) {
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

// Sport → accent color for the left border stripe
const SPORT_COLOR = {
  padel:    "bg-emerald-500",
  tennis:   "bg-yellow-500",
  squash:   "bg-red-500",
  badminton:"bg-blue-500",
};

const SPORT_LIGHT = {
  padel:    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  tennis:   "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  squash:   "bg-red-500/10 text-red-700 dark:text-red-400",
  badminton:"bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

const SPORT_LABEL = {
  padel: "پادل", tennis: "تنیس", squash: "اسکواش", badminton: "بدمینتون",
};

// ── BookingCard ───────────────────────────────────────────────────────────────

function BookingCard({ booking, index, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isApproved  = booking.status === "approved";
  const isPending   = booking.status === "pending";
  const isCancelled = booking.status === "cancelled";
  const isRejected  = booking.status === "rejected";
  const sport = booking.court?.sportType ?? "padel";
  const accentBar = isCancelled || isRejected ? "bg-red-500" : (SPORT_COLOR[sport] ?? "bg-primary");
  const sportChip = SPORT_LIGHT[sport] ?? "bg-muted text-muted-foreground";

  const handleCancel = async () => {
    setCancelling(true);
    const res = await bookingService.cancelBooking(booking.id);
    setCancelling(false);
    if (res.ok) {
      toast.success("رزرو لغو شد");
      onCancel(booking.id);
    } else {
      toast.error(res.data?.message ?? "خطا در لغو رزرو");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ delay: index * 0.05 }}
      layout
    >
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Sport color strip top */}
        <div className={cn("h-1", accentBar)} />

        <div className="p-4">
          {/* ── Row 1: court name + status ── */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm leading-snug">
                {booking.court?.name ?? "زمین نامشخص"}
              </p>
              {booking.court?.location && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{booking.court.location}</span>
                </div>
              )}
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          {/* ── Row 2: sport chip + date + time + price ── */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className={cn("px-2 py-0.5 rounded-full font-semibold text-[11px]", sportChip)}>
              {SPORT_LABEL[sport] ?? sport}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <CalendarIcon className="w-3 h-3" />
              {formatDateFa(booking.date)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <ClockIcon className="w-3 h-3" />
              {booking.startTime}–{booking.endTime}
            </span>
            <span className="font-semibold text-foreground mr-auto">
              {formatPrice(booking.totalPrice)} ت
            </span>
          </div>

          {/* ── Admin note ── */}
          {booking.adminNote && (
            <div className="mt-2.5 text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2">
              <span className="font-semibold text-foreground">یادداشت مدیر: </span>
              {booking.adminNote}
            </div>
          )}

          {/* ── Approved: expandable manager contact ── */}
          {isApproved && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 active:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-3.5 h-3.5" />
                  <span>تماس با مدیر مجموعه</span>
                </div>
                {expanded
                  ? <ChevronUpIcon className="w-3.5 h-3.5" />
                  : <ChevronDownIcon className="w-3.5 h-3.5" />
                }
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 bg-muted/50 rounded-xl px-4 py-3">
                      {booking.court?.managerPhone ? (
                        <a
                          href={`tel:${booking.court.managerPhone}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <PhoneIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">شماره مدیر مجموعه</p>
                            <p className="font-black text-foreground text-base tracking-wider group-active:text-primary transition-colors">
                              {booking.court.managerPhone}
                            </p>
                          </div>
                          <span className="mr-auto text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            تماس
                          </span>
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-1">
                          شماره مدیر ثبت نشده است
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Footer: date created + cancel ── */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              ثبت: {new Date(booking.createdAt).toLocaleDateString("fa-IR")}
            </span>
            {isPending && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1 text-xs text-destructive active:opacity-70 transition-opacity"
              >
                <XCircleIcon className="w-3.5 h-3.5" />
                {cancelling ? "در حال لغو..." : "لغو رزرو"}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-20 px-6"
    >
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-5">
        <Building2Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="font-bold text-foreground text-base mb-1">هنوز رزروی ندارید</p>
      <p className="text-muted-foreground text-sm mb-6">همین الان یک زمین رزرو کنید!</p>
      <Link
        to="/clubs"
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
      >
        <Building2Icon className="w-4 h-4" />
        مشاهده مجموعه‌ها
      </Link>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyBookingPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      if (res.ok) setBookings(res.data.bookings ?? []);
      else toast.error("خطا در بارگذاری رزروها");
    } catch {
      toast.error("خطای شبکه");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = (id) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
    );
  };

  // Stats
  const pending  = bookings.filter((b) => b.status === "pending").length;
  const approved = bookings.filter((b) => b.status === "approved").length;
  const other    = bookings.filter((b) => b.status === "cancelled" || b.status === "rejected").length;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-foreground">رزروهای من</h1>
          {!loading && (
            <p className="text-muted-foreground text-sm mt-1">{bookings.length} رزرو</p>
          )}
        </motion.div>
      </div>

      {/* ── Stats ── */}
      {!loading && bookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="px-4 mb-5 grid grid-cols-3 gap-2"
        >
          {[
            { label: "در انتظار", count: pending,  bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400" },
            { label: "تأیید شده", count: approved, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
            { label: "لغو / رد",  count: other,    bg: "bg-muted",          text: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-2xl p-3 text-center", s.bg)}>
              <p className={cn("text-2xl font-black", s.text)}>{s.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-3 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3 px-4">
          <AnimatePresence>
            {bookings.map((b, i) => (
              <BookingCard key={b.id} booking={b} index={i} onCancel={handleCancel} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Refresh ── */}
      {!loading && bookings.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={fetchBookings}
          className="flex items-center gap-1.5 mx-auto mt-6 text-xs text-muted-foreground py-2 px-4 rounded-full border border-border bg-card"
        >
          <RefreshCwIcon className="w-3 h-3" />
          بروزرسانی
        </motion.button>
      )}

      {/* ── Bottom CTA ── */}
      <div className="px-4 mt-6">
        <Link
          to="/clubs"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          <Building2Icon className="w-4 h-4" />
          رزرو زمین جدید
        </Link>
      </div>
    </div>
  );
}
