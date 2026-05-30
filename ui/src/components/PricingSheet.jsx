import React, { useState, useEffect, useRef } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";

import { showPricingSheetAtom, pricingSheetTriggerSourceAtom } from "@/config/state";
import {
  CalendarCheckIcon,
  SwordsIcon,
  SparklesIcon,
  UsersIcon,
  GemIcon,
  BadgePercentIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showOverlayLoadingAtom } from "@/config/state";
import apiClient from "@/lib/apiClient";
import {
  trackPricingEvent,
  PRICING_EVENTS,
  MODAL_TYPES,
} from "@/lib/pricingAnalytics";

import "react-spring-bottom-sheet/dist/style.css";

const planBasic = {
  id: "basic",
  name: "پلاس",
  nameEn: "Basic",
  gems: 1500,
  icon: GemIcon,
  iconBg: "bg-blue-500",
  gemColor: "text-blue-500",
  popular: false,
  price: {
    monthly: 299000,
    quarterly: 897000,
    halfYearly: 1399000,
  },
  features: [
    {
      icon: CalendarCheckIcon,
      text: "رزرو راحت‌تر زمین و مدیریت بهتر برنامه بازی‌ها",
    },
    {
      icon: SwordsIcon,
      text: "دسترسی کامل‌تر به بازی‌های دوستانه و رویدادهای فعال",
    },
    {
      icon: SparklesIcon,
      text: "استفاده از دستیار هوشمند رکت‌زون برای پیشنهاد زمین و زمان مناسب",
    },
    {
      icon: BadgePercentIcon,
      text: "مشاهده آفرهای ویژه و پیشنهادهای اختصاصی باشگاه‌ها",
    },
    {
      icon: UsersIcon,
      text: "تجربه حرفه‌ای‌تر برای پیدا کردن هم‌بازی و ساخت تیم",
    },
  ],
  buttonText: "خرید",
  buttonClass: "bg-blue-500 hover:bg-blue-600 text-white",
};

const PricingSheet = () => {
  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  const [open, setOpen] = useAtom(showPricingSheetAtom);
  const [triggerSource] = useAtom(pricingSheetTriggerSourceAtom);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const hasTrackedView = useRef(false);

  // Track modal view when opened
  useEffect(() => {
    if (open && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackPricingEvent({
        eventType: PRICING_EVENTS.MODAL_VIEW,
        modalType: MODAL_TYPES.PRICING_SHEET,
        triggerSource,
        selectedPlan: planBasic.id,
        selectedPeriod,
      });
    }
    if (!open) {
      hasTrackedView.current = false;
    }
  }, [open, triggerSource]);

  const formatPrice = (price) => {
    const rounded = Math.floor(price / 1000) * 1000;
    return rounded.toLocaleString("fa-IR");
  };

  const handleConfirmPurchase = async () => {
    // Track checkout click
    trackPricingEvent({
      eventType: PRICING_EVENTS.CHECKOUT_CLICK,
      modalType: MODAL_TYPES.PRICING_SHEET,
      triggerSource,
      selectedPlan: planBasic.id,
      selectedPeriod,
    });

    setShowOverlayLoading(true);

    const { data, ok } = await apiClient.post("/payment/create", {
      type: planBasic.id,
      period: selectedPeriod,
    });
    setShowOverlayLoading(false);

    if (!ok) return toast.error("در ایجاد درگاه مشکلی به وجود آمد.");

    let redirectUrl = `${
      import.meta.env.VITE_WEBSITE_URL
    }/api/payment/redirect/${data.token}`;
    window.location.href = redirectUrl;
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={() => setOpen(false)}
      defaultSnap={({ maxHeight }) => maxHeight * 1}
      snapPoints={({ maxHeight }) => [maxHeight * 1]}
      blocking={true}
      scrollLocking={true}
      className="bottom-sheet"
    >
      <div className="relative min-h-screen bg-[#fbfaf8] dark:bg-background text-foreground overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_70%_0%,rgba(43,15,217,0.18),transparent_38%),radial-gradient(circle_at_20%_10%,rgba(239,24,113,0.12),transparent_34%)]" />
        <div className="relative px-4 pt-4 pb-28">
          <div className="flex items-center justify-between mb-4">
            <button
              className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-white/10 border border-white/70 dark:border-white/10 flex items-center justify-center shadow-sm backdrop-blur-md active:scale-95 transition-transform"
              aria-label="بستن"
              onClick={() => setOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full">
              رکت‌زون پلاس
            </span>
          </div>

          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#24115F] via-[#4C1D95] to-[#2B0FD9] px-5 py-6 text-white shadow-2xl shadow-primary/25 mb-5">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-sm" />
            <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-white/10 blur-md" />
            <div className="relative">
              <div className="w-16 h-16 rounded-[24px] bg-white/15 border border-white/20 flex items-center justify-center text-4xl shadow-lg backdrop-blur-md mb-4">
                🎾
              </div>
              <p className="text-xs font-black text-white/70 mb-1">اشتراک حرفه‌ای بازیکن‌ها</p>
              <h2 className="text-2xl font-black leading-tight">با رکت‌زون پلاس راحت‌تر بازی کن</h2>
              <p className="text-sm text-white/78 leading-relaxed mt-3">
                برای رزرو سریع‌تر، پیشنهادهای بهتر، دسترسی به امکانات ویژه و تجربه کامل‌تر رکت‌زون.
              </p>
            </div>
          </div>
        {/* Period Selection */}
        <div className="mt-1">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSelectedPeriod("monthly")}
              className={cn(
                "flex items-center justify-between py-4 px-4 rounded-[24px] border transition-all text-right relative bg-white/90 dark:bg-card shadow-sm",
                selectedPeriod === "monthly"
                  ? "border-primary bg-primary/8 shadow-lg shadow-primary/10"
                  : "border-black/[0.06] dark:border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedPeriod === "monthly"
                      ? "border-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedPeriod === "monthly" && (
                    <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-foreground font-black">۱ ماهه</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-bold text-muted-foreground">۱۵۰۰ اعتبار</span>
                </div>
              </div>
              {planBasic.price.monthly && (
                <div className="text-left">
                  <p className="font-black">{formatPrice(planBasic.price.monthly)} تومان</p>
                </div>
              )}
            </button>

            <button
              onClick={() => setSelectedPeriod("quarterly")}
              className={cn(
                "flex items-center justify-between py-4 px-4 rounded-[24px] border transition-all text-right relative bg-white/90 dark:bg-card shadow-sm",
                selectedPeriod === "quarterly"
                  ? "border-primary bg-primary/8 shadow-lg shadow-primary/10"
                  : "border-black/[0.06] dark:border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedPeriod === "quarterly"
                      ? "border-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedPeriod === "quarterly" && (
                    <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-foreground font-black">۳ ماهه</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-bold text-muted-foreground">۴۵۰۰ اعتبار</span>
                </div>
              </div>
              {planBasic.price.quarterly && (
                <div className="text-left">
                  <p className="font-black">{formatPrice(planBasic.price.quarterly)} تومان</p>
                  <span className="text-xs text-muted-foreground">
                    ( ماهانه {formatPrice(planBasic.price.quarterly / 3)} تومان
                    )
                  </span>
                </div>
              )}
            </button>

            <button
              onClick={() => setSelectedPeriod("halfYearly")}
              className={cn(
                "flex items-center justify-between py-4 px-4 rounded-[24px] border transition-all text-right relative bg-white/90 dark:bg-card shadow-sm",
                selectedPeriod === "halfYearly"
                  ? "border-primary bg-primary/8 shadow-lg shadow-primary/10"
                  : "border-black/[0.06] dark:border-border hover:border-primary/50"
              )}
            >
              <span className="absolute -top-3 left-4 text-xs text-white bg-[#ef1871] px-2.5 py-1 rounded-full font-black shadow-lg shadow-[#ef1871]/20">
                ۲۰٪ تخفیف
              </span>
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedPeriod === "halfYearly"
                      ? "border-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedPeriod === "halfYearly" && (
                    <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-foreground font-black">۶ ماهه</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-bold text-muted-foreground">۹۰۰۰ اعتبار</span>
                </div>
              </div>
              {planBasic.price.halfYearly && (
                <div className="text-left">
                  <p className="font-black">{formatPrice(planBasic.price.halfYearly)} تومان</p>
                  <span className="text-xs text-muted-foreground">
                    ( ماهانه{" "}
                    {formatPrice(Math.round(planBasic.price.halfYearly / 6))}{" "}
                    تومان ){" "}
                  </span>
                </div>
              )}
            </button>
          </div>
          {/* Price Info */}
          <p className="text-xs text-muted-foreground text-center mt-3 font-medium">
            اعتبارها برای استفاده از امکانات ویژه و سرویس‌های هوشمند رکت‌زون مصرف می‌شوند.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2.5 mb-4 pt-4">
          {planBasic.features.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <div key={index} className="flex items-center gap-3 rounded-2xl bg-white/75 dark:bg-card border border-black/[0.06] dark:border-border px-3 py-3 shadow-sm">
                <div className="flex items-center justify-center bg-primary/10 rounded-2xl p-2.5">
                  <FeatureIcon
                    className={cn(
                      "w-5 h-5 mt-0.5 shrink-0",
                      planBasic.gemColor
                    )}
                  />
                </div>

                <div className="flex items-start gap-2 flex-1">
                  <span className="text-[13px] leading-relaxed text-foreground font-semibold">
                    {feature.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Purchase Button */}
        <button
          onClick={handleConfirmPurchase}
          className="fixed bottom-0 left-0 w-full py-5 font-black transition-all text-base bg-primary text-primary-foreground shadow-2xl shadow-primary/25"
        >
          خرید رکت‌زون پلاس
        </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default PricingSheet;
