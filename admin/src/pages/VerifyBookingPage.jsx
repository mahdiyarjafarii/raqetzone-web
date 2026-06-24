import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon, CheckCircle2Icon, XCircleIcon, ClockIcon,
  UserIcon, PhoneIcon, CalendarIcon, MapPinIcon,
  BadgeCheckIcon, ReceiptIcon, BanknoteIcon, TagIcon, TicketIcon, ShoppingBagIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import { cn, getUserFullName } from "@/lib/utils";

const TEHRAN_TIME_ZONE = "Asia/Tehran";

const SPORT_LABELS = {
  padel: "پدل", tennis: "تنیس", squash: "اسکواش",
  badminton: "بدمینتون", "ping-pong": "پینگ‌پنگ",
};

const STATUS_MAP = {
  approved: { label: "تأیید شده",  color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-400" },
  pending:  { label: "در انتظار",  color: "text-yellow-600",  bg: "bg-yellow-500/10 border-yellow-400"  },
  rejected: { label: "رد شده",     color: "text-red-600",     bg: "bg-red-500/10 border-red-400"        },
  cancelled:{ label: "لغو شده",    color: "text-muted-foreground", bg: "bg-muted border-border"         },
};

function fmt(n) {
  return Number(n ?? 0).toLocaleString("fa-IR");
}

function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <span className={cn("text-sm font-semibold text-foreground", mono && "font-mono")}>{value}</span>
    </div>
  );
}

export default function VerifyBookingPage() {
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null); // { booking, isValid } | null
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef();

  const handleSearch = async (e) => {
    e?.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    const { ok, data } = await apiClient.get(`/club-panel/verify-booking/${trimmed}`);
    setLoading(false);
    if (!ok) {
      if (data?.message?.includes("یافت نشد") || data?.message?.includes("متعلق")) {
        setNotFound(true);
      } else {
        toast.error(data?.message ?? "خطای سرور");
      }
      return;
    }
    setResult(data);
  };

  const statusCfg = result ? (STATUS_MAP[result.booking.status] ?? STATUS_MAP.cancelled) : null;
  const bookingUser = result?.booking
    ? {
        firstName: result.booking.userFirstName,
        lastName: result.booking.userLastName,
      }
    : null;

  return (
    <div dir="rtl">
      <PageHeader
        title="تأیید رزرو"
        description="کد پیگیری مشتری را وارد کنید تا وضعیت رزرو را بررسی کنید"
      />

      <div className="p-6 max-w-lg mx-auto space-y-6">

        {/* ── Search input ── */}
        <form onSubmit={handleSearch}>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-primary transition-colors">
              <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); setNotFound(false); }}
                placeholder="مثلاً: RQ-123456"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none tracking-widest font-mono"
                autoComplete="off"
                autoFocus
              />
              {code && (
                <button type="button" onClick={() => { setCode(""); setResult(null); setNotFound(false); inputRef.current?.focus(); }}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <XCircleIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!code.trim() || loading}
              className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <SearchIcon className="w-4 h-4" />
              )}
              بررسی
            </button>
          </div>
        </form>

        <AnimatePresence mode="wait">

          {/* ── Not found ── */}
          {notFound && (
            <motion.div
              key="notfound"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <XCircleIcon className="w-8 h-8 text-red-500" />
              </div>
              <p className="font-bold text-foreground text-base mb-1">رزروی یافت نشد</p>
              <p className="text-muted-foreground text-sm">کد <span className="font-mono font-semibold">{code}</span> در سیستم ثبت نشده یا متعلق به باشگاه شما نیست.</p>
            </motion.div>
          )}

          {/* ── Result card ── */}
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Validity banner */}
              <div className={cn(
                "rounded-2xl border-2 p-5 flex items-center gap-4",
                result.isValid
                  ? "bg-emerald-500/8 border-emerald-400"
                  : "bg-red-500/8 border-red-400"
              )}>
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  result.isValid ? "bg-emerald-500/15" : "bg-red-500/15"
                )}>
                  {result.isValid
                    ? <BadgeCheckIcon className="w-7 h-7 text-emerald-600" />
                    : <XCircleIcon className="w-7 h-7 text-red-500" />
                  }
                </div>
                <div>
                  <p className={cn("text-lg font-black", result.isValid ? "text-emerald-700 dark:text-emerald-400" : "text-red-600")}>
                    {result.isValid ? "رزرو معتبر است ✓" : "رزرو معتبر نیست"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.isValid
                      ? "این مشتری مجاز به استفاده از زمین است"
                      : `وضعیت فعلی: ${statusCfg?.label}`}
                  </p>
                </div>
              </div>

              {/* Booking details */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ReceiptIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">جزئیات رزرو</span>
                  </div>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", statusCfg?.bg, statusCfg?.color)}>
                    {statusCfg?.label}
                  </span>
                </div>

                <div className="px-4 divide-y divide-border">
                  <InfoRow icon={UserIcon}     label="نام مشتری"   value={getUserFullName(bookingUser)} />
                  <InfoRow icon={PhoneIcon}    label="شماره موبایل" value={result.booking.userPhone || "—"} mono />
                  <InfoRow icon={MapPinIcon}   label="زمین"         value={`${result.booking.courtName} — ${SPORT_LABELS[result.booking.sportType] ?? result.booking.sportType}`} />
                  <InfoRow icon={MapPinIcon}   label="باشگاه"       value={result.booking.clubName} />
                  <InfoRow icon={CalendarIcon} label="تاریخ"        value={new Date(result.booking.date).toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE, year:"numeric", month:"long", day:"numeric" })} />
                  <InfoRow icon={ClockIcon}    label="ساعت"         value={`${result.booking.startTime} تا ${result.booking.endTime}`} mono />
                  {(() => {
                    const b = result.booking;
                    const hasDiscount = b.basePrice != null && b.basePrice > b.totalPrice;
                    if (!hasDiscount) {
                      return <InfoRow icon={BanknoteIcon} label="مبلغ" value={`${fmt(b.totalPrice)} تومان`} />;
                    }
                    const slotDiscountAmount = b.basePrice - (b.totalPrice + (b.discountAmount ?? 0));
                    return (
                      <>
                        <InfoRow icon={BanknoteIcon} label="قیمت اصلی" value={`${fmt(b.basePrice)} تومان`} />
                        {b.slotDiscountPercent > 0 && (
                          <InfoRow icon={TagIcon} label={`تخفیف زمین (٪${b.slotDiscountPercent})`} value={`- ${fmt(slotDiscountAmount)} تومان`} />
                        )}
                        {b.discountCode && (
                          <InfoRow icon={TicketIcon} label={`کد تخفیف (${b.discountCode})`} value={`- ${fmt(b.discountAmount)} تومان`} />
                        )}
                        <InfoRow icon={BanknoteIcon} label="مبلغ پرداختی" value={`${fmt(b.totalPrice)} تومان`} />
                      </>
                    );
                  })()}
                  {result.booking.assets?.length > 0 && (
                    <>
                      {result.booking.assets.map((a) => (
                        <InfoRow
                          key={a.assetId}
                          icon={ShoppingBagIcon}
                          label={`${a.name} ×${a.quantity}`}
                          value={`${fmt(a.totalPrice)} تومان`}
                        />
                      ))}
                    </>
                  )}
                  <InfoRow icon={ReceiptIcon}  label="کد پیگیری"    value={result.booking.trackingCode} mono />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Idle state ── */}
          {!result && !notFound && !loading && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BadgeCheckIcon className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground text-sm">کد پیگیری مشتری را در بالا وارد کنید</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
