import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPinIcon, CalendarIcon, ClockIcon, XCircleIcon, RefreshCwIcon,
  Building2Icon, PhoneIcon, CheckCircle2Icon, BanknoteIcon,
  CreditCardIcon, ReceiptIcon, CopyIcon, ChevronDownIcon, ChevronUpIcon,
  TimerIcon, ShieldCheckIcon, AlertCircleIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { bookingService } from "@/features/booking/services/bookingService";
import { formatPersianDateInTehran } from "@/lib/timezone";

function formatDateFa(dateStr) {
  return formatPersianDateInTehran(dateStr, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

const SPORT_LABEL = { padel: "پدل", tennis: "تنیس", squash: "اسکواش", badminton: "بدمینتون" };

const SPORT_COLOR = {
  padel:    { bar: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  tennis:   { bar: "bg-yellow-500",  chip: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"   },
  squash:   { bar: "bg-red-500",     chip: "bg-red-500/10 text-red-700 dark:text-red-400"             },
  badminton:{ bar: "bg-blue-500",    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-400"          },
};

function getBookingMeta(b) {
  const isOnlinePaid = b.paymentMethod === "online" && b.paymentStatus === "paid";
  const isCash = b.paymentMethod !== "online";

  if (b.status === "approved") return {
    label: "تأیید شده",
    icon: <CheckCircle2Icon className="w-3.5 h-3.5" />,
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    bar: "bg-emerald-500",
    cardBorder: "border-emerald-500/30",
  };
  if (b.status === "pending" && isOnlinePaid) return {
    label: "پرداخت شده · منتظر تایید",
    icon: <ShieldCheckIcon className="w-3.5 h-3.5" />,
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30",
    bar: "bg-blue-500",
    cardBorder: "border-blue-500/30",
  };
  if (b.status === "pending") return {
    label: "در حال بررسی",
    icon: <TimerIcon className="w-3.5 h-3.5" />,
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    bar: "bg-amber-500",
    cardBorder: "border-amber-500/30",
  };
  if (b.status === "cancelled") return {
    label: "لغو شده",
    icon: <XCircleIcon className="w-3.5 h-3.5" />,
    badge: "bg-muted text-muted-foreground border border-border",
    bar: "bg-border",
    cardBorder: "border-border",
  };
  if (b.status === "rejected") return {
    label: "رد شده",
    icon: <AlertCircleIcon className="w-3.5 h-3.5" />,
    badge: "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30",
    bar: "bg-red-500",
    cardBorder: "border-red-500/30",
  };
  return {
    label: b.status,
    icon: null,
    badge: "bg-muted text-muted-foreground border border-border",
    bar: "bg-border",
    cardBorder: "border-border",
  };
}

function TrackingCodePill({ code }) {
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => toast.success("کد کپی شد"));
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 bg-muted/70 border border-border rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-foreground active:scale-95 transition-transform"
    >
      <ReceiptIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      {code}
      <CopyIcon className="w-3 h-3 text-muted-foreground shrink-0" />
    </button>
  );
}

function BookingCard({ booking, index, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const meta   = getBookingMeta(booking);
  const sport  = booking.court?.sportType ?? "padel";
  const colors = SPORT_COLOR[sport] ?? { bar: "bg-primary", chip: "bg-muted text-muted-foreground" };

  const isApproved  = booking.status === "approved";
  const isPending   = booking.status === "pending";
  const isCancelled = booking.status === "cancelled" || booking.status === "rejected";
  const isOnlinePaid = booking.paymentMethod === "online" && booking.paymentStatus === "paid";

  const handleCancel = async () => {
    setCancelling(true);
    const res = await bookingService.cancelBooking(booking.id);
    setCancelling(false);
    if (res.ok) { toast.success("رزرو لغو شد"); onCancel(booking.id); }
    else toast.error(res.data?.message ?? "خطا در لغو رزرو");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ delay: index * 0.05 }}
      layout
    >
      <div className={cn("rounded-2xl border bg-card overflow-hidden shadow-sm", meta.cardBorder)}>
        {/* Status color strip */}
        <div className={cn("h-1", meta.bar)} />

        <div className="p-4 space-y-3">
          {/* Row 1: court + status badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm leading-snug truncate">
                {booking.court?.name ?? "زمین نامشخص"}
              </p>
              {booking.court?.location && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{booking.court.location}</span>
                </div>
              )}
            </div>
            <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0", meta.badge)}>
              {meta.icon}
              {meta.label}
            </div>
          </div>

          {/* Row 2: sport + date + time */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className={cn("px-2 py-0.5 rounded-full font-semibold text-[11px]", colors.chip)}>
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
          </div>

          {/* Price + payment method */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {booking.paymentMethod === "online"
                ? <><CreditCardIcon className="w-3.5 h-3.5 text-blue-500" /> پرداخت آنلاین</>
                : <><BanknoteIcon className="w-3.5 h-3.5 text-amber-500" /> پرداخت در محل</>
              }
            </div>
            <p className="font-black text-foreground text-base">
              {formatPrice(booking.totalPrice)} <span className="text-xs font-normal text-muted-foreground">تومان</span>
            </p>
          </div>

          {/* Tracking code (all non-cancelled bookings) */}
          {booking.trackingCode && !isCancelled && (
            <TrackingCodePill code={booking.trackingCode} />
          )}

          {/* Admin note */}
          {booking.adminNote && (
            <div className="text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2">
              <span className="font-semibold text-foreground">یادداشت: </span>
              {booking.adminNote}
            </div>
          )}

          {/* Approved: receipt card */}
          {isApproved && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2Icon className="w-3.5 h-3.5" />
                رزرو تأیید شده — آماده حضور باشید
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-card rounded-xl px-3 py-2">
                  <p className="text-muted-foreground mb-0.5">تاریخ</p>
                  <p className="font-semibold text-foreground">{formatDateFa(booking.date)}</p>
                </div>
                <div className="bg-card rounded-xl px-3 py-2">
                  <p className="text-muted-foreground mb-0.5">ساعت</p>
                  <p className="font-semibold text-foreground">{booking.startTime}–{booking.endTime}</p>
                </div>
              </div>

              {/* Manager contact */}
              <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between bg-emerald-500/10 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 active:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-1.5">
                  <PhoneIcon className="w-3.5 h-3.5" />
                  تماس با مدیر
                </div>
                {expanded ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    {booking.court?.managerPhone ? (
                      <a
                        href={`tel:${booking.court.managerPhone}`}
                        className="flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 group"
                      >
                        <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <PhoneIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">شماره مدیر مجموعه</p>
                          <p className="font-black text-foreground text-base tracking-wider">{booking.court.managerPhone}</p>
                        </div>
                        <span className="mr-auto text-xs text-emerald-600 dark:text-emerald-400 font-semibold">تماس</span>
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">شماره مدیر ثبت نشده</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Pending online paid: info banner */}
          {isPending && isOnlinePaid && (
            <div className="flex items-start gap-2 rounded-xl bg-blue-500/8 border border-blue-500/20 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-400">
              <ShieldCheckIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>پرداخت شما تأیید شد. منتظر تایید مدیر مجموعه باشید.</span>
            </div>
          )}

          {/* Pending cash: info banner */}
          {isPending && !isOnlinePaid && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <TimerIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>درخواست رزرو ثبت شد. در انتظار بررسی و تایید مدیر مجموعه هستید.</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              ثبت: {new Date(booking.createdAt).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" })}
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

export default function MyBookingPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

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

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (!paymentStatus) return;
    if (paymentStatus === "failed") toast.error("پرداخت آنلاین ناموفق بود");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("payment");
      next.delete("tracking");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCancel = (id) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
  };

  const pending  = bookings.filter(b => b.status === "pending").length;
  const approved = bookings.filter(b => b.status === "approved").length;
  const other    = bookings.filter(b => b.status === "cancelled" || b.status === "rejected").length;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-foreground">رزروهای من</h1>
          {!loading && (
            <p className="text-muted-foreground text-sm mt-1">{bookings.length} رزرو ثبت شده</p>
          )}
        </motion.div>
      </div>

      {/* Stats */}
      {!loading && bookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="px-4 mb-5 grid grid-cols-3 gap-2"
        >
          {[
            { label: "در انتظار", count: pending,  bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400"     },
            { label: "تأیید شده", count: approved, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400"  },
            { label: "لغو / رد",  count: other,    bg: "bg-muted",          text: "text-muted-foreground"                  },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-2xl p-3 text-center", s.bg)}>
              <p className={cn("text-2xl font-black", s.text)}>{s.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3 px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
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

      {/* Refresh */}
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

      {/* CTA */}
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
