import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarIcon, ClockIcon, MapPinIcon, PhoneIcon,
  CheckCircleIcon, XCircleIcon, LoaderIcon, TrophyIcon,
  CoinsIcon, CopyIcon, CheckIcon,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { cn } from "@/lib/utils";

const STATUS = {
  pending:   { label: "در انتظار تأیید", icon: <LoaderIcon   className="w-5 h-5 animate-spin" />, color: "text-amber-500",  bg: "bg-amber-500/10  border-amber-500/25"  },
  approved:  { label: "تأیید شده",       icon: <CheckCircleIcon className="w-5 h-5" />,            color: "text-emerald-500",bg: "bg-emerald-500/10 border-emerald-500/25" },
  rejected:  { label: "رد شده",          icon: <XCircleIcon  className="w-5 h-5" />,               color: "text-red-500",    bg: "bg-red-500/10     border-red-500/25"     },
  cancelled: { label: "لغو شده",         icon: <XCircleIcon  className="w-5 h-5" />,               color: "text-zinc-400",   bg: "bg-zinc-500/10    border-zinc-500/25"    },
};

const SPORT_ICONS = { padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸", "ping-pong":"🏓" };

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
      {copied
        ? <CheckIcon className="w-4 h-4 text-emerald-500" />
        : <CopyIcon  className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

export default function BookingTrackPage() {
  const { code } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiClient.get(`/public/bookings/track/${code}`)
      .then(({ ok, data }) => {
        if (ok) setBooking(data.booking);
        else setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoaderIcon className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="text-6xl">🔍</span>
      <h1 className="text-xl font-black text-foreground">رزرو پیدا نشد</h1>
      <p className="text-muted-foreground text-sm">کد پیگیری <span className="font-mono font-bold text-foreground">{code}</span> معتبر نیست.</p>
    </div>
  );

  const s = STATUS[booking.status] ?? STATUS.pending;
  const sport = booking.court?.sportType;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-background px-5 pt-12 pb-8">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #7c3aed 0%, transparent 60%)" }} />

        <div className="relative text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-3xl mx-auto mb-4">
            {SPORT_ICONS[sport] ?? "🏅"}
          </div>
          <h1 className="text-white font-black text-2xl mb-1">{booking.court?.name}</h1>
          <p className="text-white/60 text-sm">{booking.court?.location}</p>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-3">
        {/* Tracking code card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">کد پیگیری</span>
            <CopyButton text={booking.trackingCode} />
          </div>
          <div className="px-4 py-4 flex items-center justify-between">
            <span className="font-mono font-black text-2xl text-foreground tracking-widest">
              {booking.trackingCode}
            </span>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border", s.color, s.bg)}>
              {s.icon}
              {s.label}
            </div>
          </div>
          {booking.adminNote && (
            <div className="px-4 pb-3">
              <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
                📝 یادداشت: {booking.adminNote}
              </p>
            </div>
          )}
        </motion.div>

        {/* Date & Time */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-3"
        >
          <h2 className="text-sm font-bold text-foreground">اطلاعات رزرو</h2>

          <InfoRow icon={<CalendarIcon className="w-4 h-4 text-violet-500" />} label="تاریخ">
            {formatDate(booking.date)}
          </InfoRow>
          <InfoRow icon={<ClockIcon className="w-4 h-4 text-blue-500" />} label="ساعت">
            {booking.startTime} — {booking.endTime}
            <span className="text-muted-foreground text-xs mr-1">({booking.durationHours} ساعت)</span>
          </InfoRow>
          <InfoRow icon={<CoinsIcon className="w-4 h-4 text-emerald-500" />} label="مبلغ">
            {booking.totalPrice.toLocaleString("fa-IR")} تومان
          </InfoRow>
          {booking.user?.name && (
            <InfoRow icon={<span className="text-sm">👤</span>} label="رزرو‌کننده">
              {booking.user.name}
            </InfoRow>
          )}
        </motion.div>

        {/* Court info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
        >
          {booking.court?.image && (
            <img
              src={booking.court.image}
              alt={booking.court.name}
              className="w-full h-36 object-cover"
            />
          )}
          <div className="p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground">اطلاعات زمین</h2>
            <InfoRow icon={<MapPinIcon className="w-4 h-4 text-red-500" />} label="آدرس">
              {booking.court?.address || booking.court?.location}
            </InfoRow>
            {booking.court?.managerPhone && (
              <InfoRow icon={<PhoneIcon className="w-4 h-4 text-emerald-500" />} label="تلفن مدیر">
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${booking.court.managerPhone}`}
                    className="font-mono text-primary font-semibold"
                    dir="ltr"
                  >
                    {booking.court.managerPhone}
                  </a>
                  <CopyButton text={booking.court.managerPhone} />
                </div>
              </InfoRow>
            )}
            {booking.court?.surfaceType && (
              <InfoRow icon={<TrophyIcon className="w-4 h-4 text-amber-500" />} label="نوع سطح">
                {booking.court.surfaceType}
              </InfoRow>
            )}
          </div>
        </motion.div>

        {/* Notes */}
        {booking.notes && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="rounded-2xl bg-card border border-border shadow-sm p-4"
          >
            <p className="text-xs font-semibold text-muted-foreground mb-1">یادداشت شما</p>
            <p className="text-sm text-foreground">{booking.notes}</p>
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground pt-2">
          رکت‌زون · این صفحه عمومی است و با کد پیگیری قابل دسترسی است
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-foreground">{children}</div>
      </div>
    </div>
  );
}
