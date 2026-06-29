import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CoinsIcon,
  CopyIcon,
  CheckIcon,
  CheckCircle2Icon,
  ArrowLeftIcon,
  LoaderIcon,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { formatPersianDateInTehran } from "@/lib/timezone";

function formatDate(dateStr) {
  return formatPersianDateInTehran(dateStr, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg active:scale-90 transition-transform"
    >
      {copied
        ? <CheckIcon className="w-4 h-4 text-emerald-500" />
        : <CopyIcon className="w-4 h-4 text-white/50" />}
    </button>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const tracking = searchParams.get("tracking");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!tracking) { setNotFound(true); setLoading(false); return; }
    apiClient.get(`/public/bookings/track/${tracking}`)
      .then(({ ok, data }) => {
        if (ok) setBooking(data.booking);
        else setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [tracking]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoaderIcon className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <span className="text-6xl">⚠️</span>
        <h1 className="text-xl font-black text-foreground">اطلاعات رزرو یافت نشد</h1>
        <Link
          to="/mybooking"
          className="mt-2 text-sm text-primary font-semibold underline underline-offset-4"
        >
          مشاهده رزروهای من
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* ── Hero ── */}
      <div className="px-5 pt-10 pb-6 flex flex-col items-center text-center gap-3">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center"
        >
          <CheckCircle2Icon className="w-8 h-8 text-emerald-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h1 className="text-foreground font-black text-xl mb-0.5">پرداخت موفق</h1>
          <p className="text-muted-foreground text-sm">رزرو شما با موفقیت ثبت شد</p>
        </motion.div>

        {/* Tracking code pill */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-center gap-2 bg-muted border border-border rounded-2xl px-4 py-2"
        >
          <span className="text-muted-foreground text-xs font-medium">کد پیگیری</span>
          <span className="font-mono font-black text-foreground text-base tracking-widest">
            {booking.trackingCode}
          </span>
          <CopyButton text={booking.trackingCode} />
        </motion.div>
      </div>

      <div className="px-4 space-y-3">
        {/* ── Booking details card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 bg-muted/40 border-b border-border">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">جزئیات رزرو</p>
          </div>
          <div className="px-4 divide-y-0">
            <InfoRow icon={<MapPinIcon className="w-4 h-4" />} label="زمین">
              <span className="text-foreground">{booking.court?.name}</span>
              {booking.court?.location && (
                <span className="text-xs text-muted-foreground font-normal block mt-0.5">
                  {booking.court.location}
                </span>
              )}
            </InfoRow>
            <InfoRow icon={<CalendarIcon className="w-4 h-4" />} label="تاریخ">
              {formatDate(booking.date)}
            </InfoRow>
            <InfoRow icon={<ClockIcon className="w-4 h-4" />} label="ساعت">
              {booking.startTime} — {booking.endTime}
              <span className="text-muted-foreground text-xs font-normal mr-1.5">
                ({booking.durationHours} ساعت)
              </span>
            </InfoRow>
            <InfoRow icon={<CoinsIcon className="w-4 h-4" />} label="مبلغ پرداختی">
              <span className="text-emerald-600 dark:text-emerald-400">
                {booking.totalPrice.toLocaleString("fa-IR")} تومان
              </span>
            </InfoRow>
          </div>
        </motion.div>

        {/* ── Status notice ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-2xl bg-amber-500/8 border border-amber-500/20 px-4 py-3.5"
        >
          <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold mb-0.5">
            در انتظار تأیید مدیر
          </p>
          <p className="text-xs text-muted-foreground">
            پس از تأیید رزرو توسط مدیر مجموعه، از طریق نوتیفیکیشن مطلع خواهید شد.
          </p>
        </motion.div>

        {/* ── CTAs ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="space-y-2 pt-1"
        >
          <Link
            to="/mybooking"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
          >
            مشاهده رزروهای من
            <ArrowLeftIcon className="w-4 h-4" />
          </Link>
          <Link
            to="/clubs"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-muted text-muted-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            رزرو زمین جدید
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
