import "react-spring-bottom-sheet/dist/style.css";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "react-spring-bottom-sheet";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon, CalendarIcon, ClockIcon, BanknoteIcon, CheckCircle2Icon, ClipboardListIcon, TicketIcon, XCircleIcon, CheckCircleIcon, LoaderIcon, SparklesIcon, WalletIcon, CreditCardIcon, MinusIcon, PlusIcon, ShoppingBagIcon, FootprintsIcon, ShirtIcon, BackpackIcon, PackageIcon, DumbbellIcon, MedalIcon, LayersIcon, ZapIcon } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  addDaysToDateKey,
  formatPersianDateInTehran,
  getCurrentMinutesInTehran,
  getTodayDateKeyInTehran,
} from "@/lib/timezone";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { bookingService } from "@/features/booking/services/bookingService";
import { walletService } from "@/features/wallet/walletService";
import { currentUserAtom } from "@/config/state";
import BulkBookingSummary from "@/features/booking/components/BulkBookingSummary";
import { bulkItemPrice } from "@/features/booking/utils/pricing";

// ── helpers ───────────────────────────────────────────────────────────────────

const SPORT_ICONS = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };
const SURFACE_LABEL = { artificial: "چمن مصنوعی", clay: "خاک رس", hard: "سخت", grass: "چمن طبیعی" };
const SURFACE_COLOR = {
  artificial: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  clay: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  hard: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  grass: "bg-green-500/10 text-green-700 dark:text-green-400",
};

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

function formatDateFa(dateStr) {
  return formatPersianDateInTehran(dateStr, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function addDays(dateStr, n) {
  return addDaysToDateKey(dateStr, n);
}

function getSlotDurationHours(slot) {
  const [sh, sm] = slot.start.split(":").map(Number);
  const [eh, em] = slot.end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const rawEnd = eh * 60 + em;
  const endMin = rawEnd <= startMin ? rawEnd + 1440 : rawEnd;
  return (endMin - startMin) / 60;
}

function formatDayShort(dateStr) {
  return {
    dayNum: formatPersianDateInTehran(dateStr, { day: "numeric" }),
    dayName: formatPersianDateInTehran(dateStr, { weekday: "short" }),
    monthName: formatPersianDateInTehran(dateStr, { month: "short" }),
  };
}

// ── Court Selector ────────────────────────────────────────────────────────────

function CourtSelector({ courts, onSelect }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">کدام زمین را می‌خواهید رزرو کنید؟</p>
      {courts.map((court, i) => (
        <motion.button
          key={court.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(court)}
          className="w-full text-right"
        >
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 active:bg-muted transition-colors">
            <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
              {SPORT_ICONS[court.sportType] ?? "🏅"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">{court.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {court.surfaceType && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", SURFACE_COLOR[court.surfaceType] ?? "bg-muted text-muted-foreground")}>
                    {SURFACE_LABEL[court.surfaceType] ?? court.surfaceType}
                  </span>
                )}
                <span className="text-muted-foreground text-xs">{court.openTime}–{court.closeTime}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-primary font-black text-sm">{formatPrice(court.pricePerHour)}</p>
              <p className="text-muted-foreground text-[10px]">ت/ساعت</p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// ── Combined Date + Slots Step ────────────────────────────────────────────────

function DateSlotsStep({ court, selectedDate, onDateChange, slots, slotsLoading, selectedSlot, onSelectSlot, isCoach, bulkMode, onToggleBulk, cartStarts = [], bulkCount = 0, bulkTotal = 0, onContinueBulk }) {
  const today = getTodayDateKeyInTehran();
  // Coaches booking in bulk get a 2-week horizon; everyone else sees 10 days.
  const dayCount = isCoach && bulkMode ? 14 : 10;
  const dates = Array.from({ length: dayCount }, (_, i) => addDays(today, i));

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-muted/70 to-background p-4">
        <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl shrink-0">
            {SPORT_ICONS[court.sportType] ?? "🏅"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-base text-foreground truncate">{court.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <BanknoteIcon className="h-3.5 w-3.5" />
                {formatPrice(court.pricePerHour)} تومان/ساعت
              </span>
              {court.openTime && court.closeTime && (
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {court.openTime} تا {court.closeTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isCoach && (
        <button
          type="button"
          onClick={onToggleBulk}
          className={cn(
            "w-full flex items-center justify-between rounded-3xl border-2 px-4 py-3 transition-all",
            bulkMode ? "border-primary bg-primary/10" : "border-border bg-muted/30"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-black text-foreground">
            <LayersIcon className={cn("h-4 w-4", bulkMode ? "text-primary" : "text-muted-foreground")} />
            رزرو گروهی چند سانس
          </span>
          <span className={cn("relative h-6 w-11 rounded-full transition-colors", bulkMode ? "bg-primary" : "bg-muted-foreground/30")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", bulkMode ? "right-0.5" : "left-0.5")} />
          </span>
        </button>
      )}
      {isCoach && bulkMode && (
        <p className="rounded-2xl bg-primary/5 border border-primary/15 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          چند اسلات از روزها و زمین‌های مختلف را انتخاب کنید؛ همه با یک پرداخت ثبت می‌شوند.
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-foreground">انتخاب روز</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDateFa(selectedDate)}</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <CalendarIcon className="h-5 w-5" />
          </div>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {dates.map((date) => {
            const { dayNum, dayName, monthName } = formatDayShort(date);
            const isSelected = date === selectedDate;
            const isToday = date === today;
            return (
              <motion.button
                key={date}
                whileTap={{ scale: 0.94 }}
                onClick={() => onDateChange(date)}
                className={cn(
                  "relative flex min-h-[6.25rem] w-20 shrink-0 flex-col items-center justify-center rounded-3xl border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/25"
                    : "border-border bg-card text-foreground shadow-sm"
                )}
              >
                {isToday && (
                  <span className={cn(
                    "absolute top-2 rounded-full px-2 py-0.5 text-[9px] font-black",
                    isSelected ? "bg-white/20 text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    امروز
                  </span>
                )}
                <span className={cn("mt-2 text-[11px] font-bold", isSelected ? "text-primary-foreground/75" : "text-muted-foreground")}>
                  {dayName}
                </span>
                <span className="mt-1 text-2xl font-black leading-none">{dayNum}</span>
                <span className={cn("mt-1 text-[10px] font-bold", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {monthName}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-foreground">ساعت‌های قابل رزرو</p>
            <p className="text-xs text-muted-foreground mt-0.5">یک بازه زمانی را انتخاب کنید</p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            <SparklesIcon className="h-3.5 w-3.5" />
            {slots?.filter((slot) => !slot.isBooked && !slot.isPending && !slot.isAwaitingPayment).length?.toLocaleString("fa-IR") ?? "۰"} موجود
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
          {[
            { label: "موجود", color: "bg-primary" },
            { label: "رزرو شده", color: "bg-orange-400" },
            { label: "در بررسی", color: "bg-yellow-400" },
            { label: "بسته", color: "bg-muted-foreground/30" },
          ].map((item) => (
            <span key={item.label} className="flex items-center justify-center gap-1.5 rounded-2xl bg-muted/40 px-2 py-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
              {item.label}
            </span>
          ))}
        </div>

        {slotsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-24 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !slots || slots.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 py-10 text-center text-muted-foreground text-sm">
            <span className="text-4xl block mb-3">📅</span>
            هیچ اسلاتی برای این روز موجود نیست
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.filter(slot => {
              if (selectedDate !== today) return true;
              const nowMins = getCurrentMinutesInTehran();
              const [sh, sm] = slot.start.split(":").map(Number);
              return (sh * 60 + sm) > nowMins;
            }).map((slot, i) => {
              const isSelected = bulkMode
                ? cartStarts.includes(slot.start)
                : selectedSlot?.start === slot.start;
              const isBooked = slot.isBooked;
              const isBlocked = slot.isBlocked;
              const isManualBooked = slot.isManualBooked;
              const isPending = slot.isPending;
              const isAwaitingPayment = slot.isAwaitingPayment;
              const hasDiscount = slot.discount > 0 && slot.originalPrice;
              const unavailable = isBooked || isPending || isAwaitingPayment;
              const durationHours = getSlotDurationHours(slot);
              const displayPrice = Math.round(slot.price * durationHours);
              const displayOriginalPrice = slot.originalPrice ? Math.round(slot.originalPrice * durationHours) : null;

              let label = `تا ${slot.end}`;
              if (isBlocked) label = "بسته";
              else if (isManualBooked || (isBooked && !isBlocked)) label = "رزرو شده";
              else if (isAwaitingPayment) label = "در پرداخت";
              else if (isPending) label = "در بررسی";

              return (
                <motion.button
                  key={slot.start}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.018 }}
                  whileTap={!unavailable ? { scale: 0.96 } : {}}
                  disabled={unavailable}
                  onClick={() => !unavailable && onSelectSlot(slot)}
                  className={cn(
                    "relative flex min-h-[6.25rem] flex-col items-center justify-center overflow-hidden rounded-3xl border-2 p-3 text-center transition-all",
                    isBlocked
                      ? "bg-muted/30 border-border text-muted-foreground/40 cursor-not-allowed"
                      : isManualBooked || (isBooked && !isBlocked)
                      ? "bg-orange-500/10 border-orange-300 text-orange-500 cursor-not-allowed"
                      : isAwaitingPayment
                      ? "bg-blue-500/10 border-blue-400 text-blue-600 cursor-not-allowed"
                      : isPending
                      ? "bg-yellow-500/10 border-yellow-400 text-yellow-600 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/25"
                      : hasDiscount
                      ? "bg-emerald-500/10 border-emerald-400 text-foreground active:bg-muted"
                      : "bg-card border-border text-foreground active:bg-muted shadow-sm"
                  )}
                >
                  {!unavailable && hasDiscount && (
                    <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                      ٪{slot.discount}
                    </span>
                  )}
                  <span className="text-xl font-black leading-none">{slot.start}</span>
                  <span className={cn("mt-2 text-[11px] font-bold", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {label}
                  </span>
                  {!unavailable && slot.price && (
                    <span className={cn("mt-1 text-[10px] font-black leading-none",
                      isSelected ? "text-primary-foreground/80" : hasDiscount ? "text-emerald-600" : "text-primary"
                    )}>
                      {hasDiscount && <span className="line-through opacity-50 ml-1">{formatPrice(displayOriginalPrice)}</span>}
                      {formatPrice(displayPrice)}ت
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {isCoach && bulkMode && bulkCount > 0 && (
        <div className="sticky bottom-0 -mx-4 px-4 pt-2 pb-1 bg-gradient-to-t from-background via-background to-transparent">
          <div className="flex items-center justify-between gap-3 rounded-3xl border-2 border-primary/30 bg-card shadow-lg px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">{formatPrice(bulkCount)} سانس در سبد</p>
              <p className="text-xs text-primary font-bold">{formatPrice(bulkTotal)} تومان</p>
            </div>
            <Button onClick={onContinueBulk} className="shrink-0 rounded-xl font-bold h-11 px-5">
              ادامه
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Asset Selection ───────────────────────────────────────────────────────────

const ASSET_ICON_MAP = [
  { keys: ["پدل", "padel"],                                     Icon: DumbbellIcon,   gradient: "from-emerald-500/20 to-emerald-600/10", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { keys: ["راکت تنیس", "tennis racket", "tennis", "تنیس"],    Icon: DumbbellIcon,   gradient: "from-yellow-500/20 to-yellow-600/10",   iconColor: "text-yellow-600 dark:text-yellow-400" },
  { keys: ["راکت بدمینتون", "badminton", "بدمینتون"],           Icon: DumbbellIcon,   gradient: "from-blue-500/20 to-blue-600/10",      iconColor: "text-blue-600 dark:text-blue-400"    },
  { keys: ["اسکواش", "squash"],                                 Icon: DumbbellIcon,   gradient: "from-red-500/20 to-red-600/10",        iconColor: "text-red-600 dark:text-red-400"      },
  { keys: ["توپ", "ball"],                                      Icon: LayersIcon,     gradient: "from-orange-500/20 to-orange-600/10",  iconColor: "text-orange-600 dark:text-orange-400"},
  { keys: ["حوله", "towel"],                                    Icon: ZapIcon,        gradient: "from-cyan-500/20 to-cyan-600/10",      iconColor: "text-cyan-600 dark:text-cyan-400"    },
  { keys: ["کفش", "shoe"],                                      Icon: FootprintsIcon, gradient: "from-purple-500/20 to-purple-600/10",  iconColor: "text-purple-600 dark:text-purple-400"},
  { keys: ["ساک", "bag", "کیف"],                               Icon: BackpackIcon,   gradient: "from-slate-500/20 to-slate-600/10",   iconColor: "text-slate-600 dark:text-slate-400"  },
  { keys: ["دستکش", "glove"],                                   Icon: ShirtIcon,      gradient: "from-pink-500/20 to-pink-600/10",      iconColor: "text-pink-600 dark:text-pink-400"    },
  { keys: ["مچ‌بند", "wristband"],                              Icon: MedalIcon,      gradient: "from-amber-500/20 to-amber-600/10",   iconColor: "text-amber-600 dark:text-amber-500"  },
];

function getAssetIconConfig(name) {
  const lower = name.toLowerCase();
  for (const cfg of ASSET_ICON_MAP) {
    if (cfg.keys.some((k) => lower.includes(k.toLowerCase()))) return cfg;
  }
  return { Icon: PackageIcon, gradient: "from-muted/60 to-muted/30", iconColor: "text-muted-foreground" };
}

function AssetSelectionStep({ quantities, onQuantitiesChange, assets, onContinue, onBack }) {
  if (assets.length === 0) return null;

  const total = assets.reduce((sum, a) => sum + a.pricePerUnit * (quantities[a.id] ?? 0), 0);
  const selectedCount = assets.filter((a) => (quantities[a.id] ?? 0) > 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-background p-5">
        <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/12 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
            <ShoppingBagIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-0.5">اختیاری</p>
            <h3 className="text-base font-black text-foreground leading-snug">تجهیزات اجاره‌ای</h3>
            <p className="text-xs text-muted-foreground mt-1">هر چیزی نیاز نداری، روی صفر بذار</p>
          </div>
        </div>
      </div>

      {/* Asset list */}
      <div className="space-y-2.5">
        {assets.map((asset, i) => {
          const qty = quantities[asset.id] ?? 0;
          const { Icon, gradient, iconColor } = getAssetIconConfig(asset.name);
          const isSelected = qty > 0;
          return (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 transition-all",
                isSelected ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border bg-card"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br ring-1 transition-all",
                isSelected ? `${gradient} ring-primary/20` : "from-muted/60 to-muted/30 ring-border"
              )}>
                <Icon className={cn("w-5 h-5 transition-colors", isSelected ? iconColor : "text-muted-foreground")} strokeWidth={2} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight">{asset.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatPrice(asset.pricePerUnit)} <span className="opacity-70">ت / عدد</span>
                </p>
                {isSelected && (
                  <p className="text-[11px] text-primary font-semibold mt-0.5">
                    جمع: {formatPrice(asset.pricePerUnit * qty)} تومان
                  </p>
                )}
              </div>

              {/* Counter */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onQuantitiesChange({ ...quantities, [asset.id]: Math.max(0, qty - 1) })}
                  disabled={qty === 0}
                  className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center disabled:opacity-25 active:scale-90 transition-all"
                >
                  <MinusIcon className="w-4 h-4 text-foreground" />
                </button>
                <span className={cn(
                  "text-base font-black w-6 text-center tabular-nums transition-colors",
                  isSelected ? "text-primary" : "text-foreground/40"
                )}>{qty}</span>
                <button
                  type="button"
                  onClick={() => onQuantitiesChange({ ...quantities, [asset.id]: qty + 1 })}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all",
                    isSelected ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "bg-primary/12 text-primary"
                  )}
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total / empty state */}
      {total > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl bg-primary/8 border border-primary/20 px-4 py-3.5"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ShoppingBagIcon className="w-4 h-4 text-primary" />
            <span>{selectedCount} تجهیز انتخاب شده</span>
          </div>
          <span className="text-primary font-black text-base">{formatPrice(total)} ت</span>
        </motion.div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
          <PackageIcon className="w-3.5 h-3.5" />
          <span>بدون تجهیزات هم می‌تونی ادامه بدی</span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-5 rounded-2xl border border-border text-sm font-bold text-foreground bg-background active:bg-muted transition-colors"
        >
          بازگشت
        </button>
        <Button onClick={onContinue} className="flex-1 rounded-2xl font-bold text-sm h-12">
          {total > 0 ? `ادامه · ${formatPrice(total)} ت` : "ادامه بدون تجهیزات"}
        </Button>
      </div>
    </div>
  );
}

// ── Booking Summary ───────────────────────────────────────────────────────────

function BookingSummaryStep({ court, date, slot, clubId, selectedAssets, onConfirm, onBack, submitting }) {
  const [notes, setNotes] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountState, setDiscountState] = useState(null); // null | { valid, discountAmount, finalPrice, discountValue, discountType, discountCodeId, error }
  const [validating, setValidating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("none");
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const durationHours = getSlotDurationHours(slot);
  const pricePerHour = slot.price ?? court.pricePerHour;
  const baseTotal = Math.round(pricePerHour * durationHours);
  const originalTotal = slot.originalPrice ? Math.round(slot.originalPrice * durationHours) : null;

  const assetsTotal = selectedAssets.reduce((sum, a) => sum + a.totalPrice, 0);
  const voucherDiscount = discountState?.valid ? discountState.discountAmount : 0;
  const afterVoucher = Math.max(0, baseTotal - voucherDiscount);
  const finalTotal = afterVoucher + assetsTotal;
  const walletBalance = wallet?.balance ?? 0;
  const canPayWithWallet = walletBalance >= finalTotal;

  useEffect(() => {
    let alive = true;
    setWalletLoading(true);
    walletService.getWallet()
      .then((res) => {
        if (alive && res.ok) setWallet(res.data?.wallet ?? null);
      })
      .finally(() => {
        if (alive) setWalletLoading(false);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (paymentMethod === "wallet" && !canPayWithWallet) setPaymentMethod("none");
  }, [canPayWithWallet, paymentMethod]);

  const handleValidate = async () => {
    const code = discountInput.trim().toUpperCase();
    if (!code) return;
    setValidating(true);
    setDiscountState(null);
    const res = await bookingService.validateDiscount(code, clubId, baseTotal);
    setValidating(false);
    if (res.ok) {
      setDiscountState({ valid: true, ...res.data, code });
      toast.success(`کد تخفیف اعمال شد — ${formatPrice(res.data.discountAmount)} تومان تخفیف`);
    } else {
      setDiscountState({ valid: false, error: res.data?.message ?? "کد معتبر نیست" });
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountState(null);
    setDiscountInput("");
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-4">
        <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl shadow-lg shadow-primary/25">
            {SPORT_ICONS[court.sportType] ?? "🏅"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary mb-1">فاکتور رزرو</p>
            <h3 className="text-lg font-black text-foreground truncate">{court.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{formatDateFa(date)} · {slot.start} تا {slot.end}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border border-b border-border">
          <div className="p-4 text-center">
            <CalendarIcon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground mb-1">تاریخ</p>
            <p className="text-sm font-black text-foreground leading-6">{formatDateFa(date)}</p>
          </div>
          <div className="p-4 text-center">
            <ClockIcon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground mb-1">زمان</p>
            <p className="text-sm font-black text-foreground">{slot.start} — {slot.end}</p>
            <p className="text-xs text-muted-foreground mt-1">{durationHours.toLocaleString("fa-IR")} ساعت</p>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <BanknoteIcon className="w-4 h-4 text-primary" />
          <p className="text-xs font-black text-foreground">جزئیات پرداخت</p>
        </div>

        <div className="divide-y divide-border">
          {[
            { icon: <CalendarIcon className="w-4 h-4" />, label: "تاریخ", value: formatDateFa(date) },
            { icon: <ClockIcon className="w-4 h-4" />, label: "زمان", value: `${slot.start} – ${slot.end}` },
            { icon: <ClockIcon className="w-4 h-4" />, label: "مدت", value: `${durationHours} ساعت` },
            originalTotal ? { icon: <BanknoteIcon className="w-4 h-4" />, label: "قیمت اصلی", value: formatPrice(originalTotal) + " ت", strike: true } : null,
            originalTotal ? { icon: <BanknoteIcon className="w-4 h-4" />, label: `تخفیف اسلات (${slot.discount}٪)`, value: `- ${formatPrice(originalTotal - baseTotal)} ت`, discount: true } : null,
            { icon: <BanknoteIcon className="w-4 h-4" />, label: "اجاره زمین", value: `${formatPrice(baseTotal)} ت` },
            voucherDiscount > 0 ? {
              icon: <TicketIcon className="w-4 h-4" />,
              label: `کد تخفیف (${discountState.code})`,
              value: `- ${formatPrice(voucherDiscount)} ت`,
              discount: true,
            } : null,
            ...selectedAssets.map((a) => ({
              icon: <ShoppingBagIcon className="w-4 h-4" />,
              label: `${a.name} ×${a.quantity}`,
              value: `${formatPrice(a.totalPrice)} ت`,
            })),
          ].filter(Boolean).map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                {row.icon}
                <span>{row.label}</span>
              </div>
              <span className={cn("text-sm font-medium",
                row.strike ? "text-muted-foreground line-through" : row.discount ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}>{row.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-5 bg-primary/8 border-t-2 border-primary/25">
          <span className="text-primary font-black text-sm">مبلغ نهایی</span>
          <div className="text-right">
            {voucherDiscount > 0 && (
              <p className="text-xs text-muted-foreground line-through leading-none mb-0.5">
                {formatPrice(baseTotal + assetsTotal)} ت
              </p>
            )}
            <span className="text-primary font-black text-2xl">
              {formatPrice(finalTotal)} <span className="text-sm font-bold">تومان</span>
            </span>
          </div>
        </div>
      </div>

      {/* Discount code input */}
      {discountState?.valid ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3">
          <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              کد <span className="font-mono tracking-wider">{discountState.code}</span> اعمال شد
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
              {discountState.discountType === "percent"
                ? `${discountState.discountValue}٪`
                : `${formatPrice(discountState.discountValue)} تومان`} تخفیف — صرفه‌جویی {formatPrice(voucherDiscount)} تومان
            </p>
          </div>
          <button onClick={handleRemoveDiscount} className="p-1 rounded-lg text-emerald-600/60 hover:text-red-500 transition-colors">
            <XCircleIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <TicketIcon className="w-3.5 h-3.5" />
            کد تخفیف دارید؟
          </label>
          <div className="flex gap-2">
            <input
              value={discountInput}
              onChange={(e) => {
                setDiscountInput(e.target.value.toUpperCase());
                if (discountState?.valid === false) setDiscountState(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              placeholder="کد تخفیف را وارد کنید"
              className={cn(
                "flex-1 h-11 rounded-xl border bg-background px-3 text-sm font-mono tracking-widest text-foreground placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 transition-colors",
                discountState?.valid === false
                  ? "border-red-400 focus:ring-red-400/30"
                  : "border-input focus:ring-ring/30"
              )}
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={!discountInput.trim() || validating}
              className="h-11 px-4 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {validating
                ? <LoaderIcon className="w-4 h-4 animate-spin" />
                : "اعمال"}
            </button>
          </div>
          {discountState?.valid === false && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <XCircleIcon className="w-3.5 h-3.5 shrink-0" />
              {discountState.error}
            </p>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <WalletIcon className="w-4 h-4 text-primary" />
          <p className="text-sm font-black text-foreground">روش پرداخت</p>
        </div>
        <button
          type="button"
          onClick={() => setPaymentMethod("none")}
          className={cn(
            "w-full rounded-2xl border-2 p-3 text-right transition-all",
            paymentMethod === "none" ? "border-primary bg-primary/10" : "border-border bg-muted/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", paymentMethod === "none" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground">پرداخت حضوری</p>
              <p className="text-xs text-muted-foreground mt-0.5">رزرو ثبت می‌شود و تسویه طبق روال مجموعه انجام می‌شود</p>
            </div>
            {paymentMethod === "none" && <CheckCircleIcon className="w-5 h-5 text-primary" />}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod("online")}
          className={cn(
            "w-full rounded-2xl border-2 p-3 text-right transition-all",
            paymentMethod === "online" ? "border-primary bg-primary/10" : "border-border bg-muted/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", paymentMethod === "online" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground">پرداخت آنلاین (زرین‌پال)</p>
              <p className="text-xs text-muted-foreground mt-0.5">بعد از ثبت رزرو، به درگاه پرداخت منتقل می‌شوید</p>
            </div>
            {paymentMethod === "online" && <CheckCircleIcon className="w-5 h-5 text-primary" />}
          </div>
        </button>
        <button
          type="button"
          onClick={() => canPayWithWallet && setPaymentMethod("wallet")}
          disabled={!canPayWithWallet || walletLoading}
          className={cn(
            "w-full rounded-2xl border-2 p-3 text-right transition-all disabled:opacity-55",
            paymentMethod === "wallet" ? "border-primary bg-primary/10" : "border-border bg-muted/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", paymentMethod === "wallet" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              <WalletIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground">پرداخت با کیف پول</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {walletLoading ? "در حال دریافت موجودی..." : `موجودی: ${formatPrice(walletBalance)} تومان`}
                {!walletLoading && !canPayWithWallet ? " · موجودی کافی نیست" : ""}
              </p>
            </div>
            {paymentMethod === "wallet" && <CheckCircleIcon className="w-5 h-5 text-primary" />}
          </div>
        </button>
        
        <div className="w-full rounded-2xl border-2 border-border bg-muted/20 p-3 text-right opacity-50 cursor-not-allowed select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <span className="text-lg">⚡</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-foreground">اسنپ‌پی</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  به زودی
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">پرداخت از طریق اسنپ‌پی در آینده اضافه می‌شود</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-2 block">یادداشت (اختیاری)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="توضیحات اضافه..."
          className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors resize-none"
        />
      </div>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
        ⏳ پس از ارسال درخواست، مدیر مجموعه تأیید می‌کند.
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="rounded-xl">
          بازگشت
        </Button>
        <Button
          onClick={() => onConfirm(notes, discountState?.valid ? discountState.code : undefined, paymentMethod, selectedAssets)}
          disabled={submitting}
          className="flex-1 rounded-xl font-bold text-sm h-12"
        >
          {submitting ? "در حال ثبت..." : "تأیید و ثبت رزرو"}
        </Button>
      </div>
    </div>
  );
}

// ── Success ───────────────────────────────────────────────────────────────────

function SuccessStep({ booking, onClose, onViewBookings }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-6 gap-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.15 }}
        className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center"
      >
        <CheckCircle2Icon className="w-10 h-10 text-emerald-500" />
      </motion.div>

      <div>
        <h3 className="text-xl font-black text-foreground mb-1">رزرو ثبت شد! 🎉</h3>
        <p className="text-sm text-muted-foreground">درخواست شما ارسال شد و منتظر تأیید مدیر است.</p>
      </div>

      {booking && (
        <div className="w-full rounded-2xl bg-muted/50 border border-border p-4 text-sm space-y-2.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">زمین</span>
            <span className="font-semibold text-foreground">{booking.court?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">تاریخ</span>
            <span className="font-semibold text-foreground">{formatDateFa(booking.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">زمان</span>
            <span className="font-semibold text-foreground">{booking.startTime} – {booking.endTime}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground">وضعیت</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              در انتظار تأیید
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 w-full">
        <Button onClick={onViewBookings} className="w-full rounded-xl h-12 font-bold">
          <ClipboardListIcon className="w-4 h-4 ml-2" />
          مشاهده رزروهای من
        </Button>
        <Button variant="outline" onClick={onClose} className="w-full rounded-xl h-11 text-sm">
          بازگشت به مجموعه
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const STEP_TITLES = {
  court:       "انتخاب زمین",
  booking:     "انتخاب تاریخ و زمان",
  assets:      "تجهیزات اجاره‌ای",
  summary:     "تأیید رزرو",
  bulkSummary: "تأیید رزرو گروهی",
  success:     "رزرو ثبت شد",
};

export default function ClubBookingSheet({ open, onClose, club, initialCourt = null, initialDate = null, initialSlotStart = null }) {
  const navigate = useNavigate();
  const today = getTodayDateKeyInTehran();
  const currentUser = useAtomValue(currentUserAtom);
  const isCoach = Boolean(currentUser?.isCoach);

  const courts = club?.courts ?? [];

  const [step, setStep] = useState("court");
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [pendingDealSlotStart, setPendingDealSlotStart] = useState(null);
  const [clubAssets, setClubAssets] = useState([]);
  const [assetQuantities, setAssetQuantities] = useState({});
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCart, setBulkCart] = useState([]); // { court, date, slot }

  // Bulk-cart slot starts for the currently viewed court + date (for highlighting)
  const cartStarts = bulkCart
    .filter((i) => selectedCourt && i.court.id === selectedCourt.id && i.date === selectedDate)
    .map((i) => i.slot.start);
  const bulkTotal = bulkCart.reduce((sum, it) => sum + bulkItemPrice(it), 0);

  const goToBooking = useCallback((court) => {
    setSelectedCourt(court);
    setStep("booking");
  }, []);

  const reset = useCallback(() => {
    setSelectedDate(initialDate ?? today);
    setSelectedSlot(null);
    setSlots([]);
    setCreatedBooking(null);
    setPendingDealSlotStart(null);
    setAssetQuantities({});
    setBulkMode(false);
    setBulkCart([]);
    if (initialCourt) {
      setSelectedCourt(initialCourt);
      setStep("booking");
    } else if (courts.length === 1) {
      setSelectedCourt(courts[0]);
      setStep("booking");
    } else {
      setSelectedCourt(null);
      setStep("court");
    }
  }, [courts, initialCourt, initialDate, initialSlotStart, today]);

  // Init on open
  useEffect(() => {
    if (!open) return;
    const court = initialCourt ?? (courts.length === 1 ? courts[0] : null);
    setSelectedSlot(null);
    setCreatedBooking(null);
    setPendingDealSlotStart(initialSlotStart ?? null);
    setSelectedDate(initialDate ?? today);
    setBulkMode(false);
    setBulkCart([]);
    if (court) {
      setSelectedCourt(court);
      setStep("booking");
    } else {
      setSelectedCourt(null);
      setStep("court");
    }
  }, [open, initialCourt, initialDate, initialSlotStart, courts, today]);

  // Fetch club assets once when sheet opens
  useEffect(() => {
    if (!open || !club?.id) return;
    bookingService.getClubAssets(club.id)
      .then((res) => { if (res.ok) setClubAssets(res.data ?? []); })
      .catch(() => {});
  }, [open, club?.id]);

  // Fetch slots whenever court or date changes (in booking step)
  useEffect(() => {
    if (!open || step !== "booking" || !selectedCourt) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    bookingService.getAvailability(selectedCourt.id, selectedDate)
      .then((res) => {
        const nextSlots = res.ok ? (res.data?.slots ?? []) : [];
        setSlots(nextSlots);

        if (pendingDealSlotStart) {
          const slot = nextSlots.find((item) => item.start === pendingDealSlotStart);
          if (slot && !slot.isBooked && !slot.isPending && !slot.isBlocked && !slot.isManualBooked) {
            setSelectedSlot(slot);
            setStep(clubAssets.length > 0 ? "assets" : "summary");
          } else {
            toast.error("این آفر دیگر در دسترس نیست");
          }
          setPendingDealSlotStart(null);
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [open, selectedCourt, selectedDate, step, pendingDealSlotStart]);

  const toggleBulkMode = () => {
    setBulkMode((on) => {
      if (on) setBulkCart([]); // turning off clears the cart
      return !on;
    });
  };

  // In the booking step, a slot tap either advances the single-booking flow or
  // toggles the slot in the bulk cart (coach bulk mode).
  const handleSlotPick = (slot) => {
    if (bulkMode && selectedCourt) {
      setBulkCart((prev) => {
        const exists = prev.some(
          (i) => i.court.id === selectedCourt.id && i.date === selectedDate && i.slot.start === slot.start
        );
        if (exists) {
          return prev.filter(
            (i) => !(i.court.id === selectedCourt.id && i.date === selectedDate && i.slot.start === slot.start)
          );
        }
        return [...prev, { court: selectedCourt, date: selectedDate, slot }];
      });
      return;
    }
    setSelectedSlot(slot);
    setStep(clubAssets.length > 0 ? "assets" : "summary");
  };

  const removeCartItem = (item) => {
    setBulkCart((prev) => {
      const next = prev.filter(
        (i) => !(i.court.id === item.court.id && i.date === item.date && i.slot.start === item.slot.start)
      );
      if (next.length === 0) setStep("booking"); // nothing left to confirm
      return next;
    });
  };

  const handleConfirmBulk = async (paymentMethod = "none", notes = "") => {
    if (bulkCart.length === 0) return;
    setSubmitting(true);
    try {
      const items = bulkCart.map((i) => ({
        courtId: i.court.id,
        date: i.date,
        startTime: i.slot.start,
        endTime: i.slot.end,
        notes,
      }));
      const res = await bookingService.createBulkBooking({ items, paymentMethod });
      if (res.ok) {
        if (paymentMethod === "online" && res.data?.payment?.redirectUrl) {
          window.location.href = res.data.payment.redirectUrl;
          return;
        }
        if (res.data?.wallet) {
          window.dispatchEvent(new CustomEvent("wallet:updated", { detail: res.data.wallet }));
        }
        toast.success(`${(res.data?.bookings?.length ?? bulkCart.length).toLocaleString("fa-IR")} سانس با موفقیت ثبت شد`);
        reset();
        onClose();
        navigate("/mybooking");
      } else {
        toast.error(res.data?.message ?? "خطا در ثبت رزرو گروهی");
      }
    } catch {
      toast.error("خطا در ثبت رزرو گروهی");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (notes, discountCode, paymentMethod = "none", selectedAssets = []) => {
    if (!selectedCourt || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await bookingService.createBooking({
        courtId: selectedCourt.id,
        date: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        notes,
        paymentMethod,
        ...(discountCode ? { discountCode } : {}),
        assets: selectedAssets.map((a) => ({ assetId: a.id, quantity: a.quantity })),
      });
      if (res.ok) {
        if (paymentMethod === "online" && res.data?.payment?.redirectUrl) {
          window.location.href = res.data.payment.redirectUrl;
          return;
        }
        if (res.data?.wallet) {
          window.dispatchEvent(new CustomEvent("wallet:updated", { detail: res.data.wallet }));
        }
        setCreatedBooking({ ...res.data.booking, court: selectedCourt, date: selectedDate, startTime: selectedSlot.start, endTime: selectedSlot.end });
        setStep("success");
      } else {
        toast.error(res.data?.message ?? "خطا در ثبت رزرو");
      }
    } catch {
      toast.error("خطا در ثبت رزرو");
    } finally {
      setSubmitting(false);
    }
  };

  const showBack = (step === "booking" && courts.length > 1 && !initialCourt) || step === "assets" || step === "summary" || step === "bulkSummary";

  const handleBack = () => {
    if (step === "booking") { setStep("court"); setSelectedCourt(null); }
    else if (step === "assets") setStep("booking");
    else if (step === "summary") setStep(clubAssets.length > 0 ? "assets" : "booking");
    else if (step === "bulkSummary") setStep("booking");
  };

  const selectedAssetsList = clubAssets
    .filter((a) => (assetQuantities[a.id] ?? 0) > 0)
    .map((a) => ({ id: a.id, name: a.name, quantity: assetQuantities[a.id], unitPrice: a.pricePerUnit, totalPrice: a.pricePerUnit * assetQuantities[a.id] }));

  return (
    <BottomSheet
      open={open}
      onDismiss={() => { if (step !== "success") onClose(); else { reset(); onClose(); } }}
      snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.92, 720)]}
      defaultSnap={({ snapPoints }) => snapPoints[0]}
      header={
        <div className="flex items-center gap-3 px-1">
          {showBack ? (
            <button onClick={handleBack} className="p-1.5 rounded-full bg-muted">
              <ArrowRightIcon className="w-4 h-4 text-foreground" />
            </button>
          ) : <div className="w-8" />}
          <h2 className="flex-1 font-bold text-foreground text-center text-base">
            {STEP_TITLES[step]}
          </h2>
          <div className="w-8" />
        </div>
      }
    >
      <div className="px-4 pt-4 pb-8">
        <AnimatePresence mode="wait">
          {step === "court" && (
            <motion.div key="court" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {courts.length === 0 ? (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-4 text-amber-700 dark:text-amber-400 text-xs text-center">
                  ⚠️ زمین‌های این مجموعه هنوز در سیستم ثبت نشده‌اند.
                </div>
              ) : (
                <CourtSelector courts={courts} onSelect={goToBooking} />
              )}
            </motion.div>
          )}

          {step === "booking" && selectedCourt && (
            <motion.div key="booking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <DateSlotsStep
                court={selectedCourt}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                slots={slots}
                slotsLoading={slotsLoading}
                selectedSlot={selectedSlot}
                onSelectSlot={handleSlotPick}
                isCoach={isCoach}
                bulkMode={bulkMode}
                onToggleBulk={toggleBulkMode}
                cartStarts={cartStarts}
                bulkCount={bulkCart.length}
                bulkTotal={bulkTotal}
                onContinueBulk={() => setStep("bulkSummary")}
              />
            </motion.div>
          )}

          {step === "bulkSummary" && bulkCart.length > 0 && (
            <motion.div key="bulkSummary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BulkBookingSummary
                items={bulkCart}
                onConfirm={handleConfirmBulk}
                onRemove={removeCartItem}
                onBack={() => setStep("booking")}
                submitting={submitting}
              />
            </motion.div>
          )}

          {step === "assets" && selectedCourt && selectedSlot && (
            <motion.div key="assets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <AssetSelectionStep
                clubId={club?.id}
                assets={clubAssets}
                quantities={assetQuantities}
                onQuantitiesChange={setAssetQuantities}
                onContinue={() => setStep("summary")}
                onBack={() => setStep("booking")}
              />
            </motion.div>
          )}

          {step === "summary" && selectedCourt && selectedDate && selectedSlot && (
            <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BookingSummaryStep
                court={selectedCourt}
                date={selectedDate}
                slot={selectedSlot}
                clubId={club?.id}
                selectedAssets={selectedAssetsList}
                onConfirm={handleConfirm}
                onBack={() => setStep(clubAssets.length > 0 ? "assets" : "booking")}
                submitting={submitting}
              />
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SuccessStep
                booking={createdBooking}
                onClose={() => { reset(); onClose(); }}
                onViewBookings={() => { reset(); onClose(); navigate("/mybooking"); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}
