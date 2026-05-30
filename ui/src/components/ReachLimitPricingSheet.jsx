import React, { useState, useEffect, useRef } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { X } from "lucide-react";

import {
  showReachLimitPricingSheetAtom,
  hasTitleReachLimitPricingSheetAtom,
  showOverlayLoadingAtom,
  reachLimitPricingSheetTriggerSourceAtom,
} from "@/config/state";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import {
  trackPricingEvent,
  PRICING_EVENTS,
  MODAL_TYPES,
} from "@/lib/pricingAnalytics";

import "react-spring-bottom-sheet/dist/style.css";

// Basic plan pricing (1,000 gems)
const basicPlanPrice = {
  monthly: 299000,
  quarterly: 897000,
  halfYearly: 1399000,
  yearly: 2290000,
};

const monthlyPrices = {
  monthly: 290000,
  quarterly: 299000,
  halfYearly: 233000,
  yearly: 190000,
};

const periods = [
  {
    id: "monthly",
    label: "۱ ماهه",
    label2: "۱۵۰۰ اعتبار",
    price: basicPlanPrice.monthly,
    discount: null,
  },
  {
    id: "quarterly",
    label: "۳ ماهه",
    label2: "۴۵۰۰ اعتبار",
    price: basicPlanPrice.quarterly,
    monthlyPrice: monthlyPrices.quarterly,
    // discount: "۳۰٪ تخفیف",
  },
  {
    id: "halfYearly",
    label: "۶ ماهه",
    label2: "۹۰۰۰ اعتبار",
    price: basicPlanPrice.halfYearly,
    monthlyPrice: monthlyPrices.halfYearly,
    discount: "۲۰٪ تخفیف",
  },
];

const ReachLimitPricingSheet = () => {
  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  const [open, setOpen] = useAtom(showReachLimitPricingSheetAtom);
  useAtom(hasTitleReachLimitPricingSheetAtom);
  const [triggerSource] = useAtom(reachLimitPricingSheetTriggerSourceAtom);

  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const hasTrackedView = useRef(false);

  // Track modal view when opened
  useEffect(() => {
    if (open && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackPricingEvent({
        eventType: PRICING_EVENTS.MODAL_VIEW,
        modalType: MODAL_TYPES.REACH_LIMIT_PRICING_SHEET,
        triggerSource,
        selectedPlan: "basic",
        selectedPeriod,
      });
    }
    if (!open) {
      hasTrackedView.current = false;
    }
  }, [open, triggerSource]);

  const handlePurchase = async () => {
    // Track checkout click
    trackPricingEvent({
      eventType: PRICING_EVENTS.CHECKOUT_CLICK,
      modalType: MODAL_TYPES.REACH_LIMIT_PRICING_SHEET,
      triggerSource,
      selectedPlan: "basic",
      selectedPeriod,
    });

    setOpen(false);
    setShowOverlayLoading(true);

    const { data, ok } = await apiClient.post("/payment/create", {
      type: "basic",
      period: selectedPeriod,
    });
    setShowOverlayLoading(false);

    if (!ok) return toast.error("در ایجاد درگاه مشکلی به وجود آمد.");

    let redirectUrl = `${import.meta.env.VITE_WEBSITE_URL}/api/payment/redirect/${data.token}`;
    window.location.href = redirectUrl;
  };

  const formatPrice = (price) => {
    return price.toLocaleString("fa-IR");
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
      <div className="relative overflow-hidden bg-[#fbfaf8] dark:bg-background flex flex-col h-[calc(100vh-1.3rem)]">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_70%_0%,rgba(43,15,217,0.18),transparent_38%),radial-gradient(circle_at_20%_10%,rgba(239,24,113,0.12),transparent_34%)]" />
        <button
          aria-label="بستن"
          onClick={() => setOpen(false)}
          className="absolute top-4 left-4 z-30 w-11 h-11 rounded-2xl bg-white/80 dark:bg-white/10 border border-white/70 dark:border-white/10 flex items-center justify-center shadow-sm backdrop-blur-md active:scale-95 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-16 pb-28">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#24115F] via-[#4C1D95] to-[#2B0FD9] px-5 py-6 text-white shadow-2xl shadow-primary/25 mb-5">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-sm" />
            <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-white/10 blur-md" />
            <div className="relative">
              <div className="w-16 h-16 rounded-[24px] bg-white/15 border border-white/20 flex items-center justify-center text-4xl shadow-lg backdrop-blur-md mb-4">
                🎾
              </div>
              <p className="text-xs font-black text-white/70 mb-1">اعتبار شما تمام شده</p>
              <h2 className="text-2xl font-black leading-tight">با رکت‌زون پلاس ادامه بده</h2>
              <p className="text-sm text-white/78 leading-relaxed mt-3">
                برای استفاده از امکانات ویژه، پیشنهادهای هوشمند و تجربه کامل‌تر رکت‌زون، یکی از دوره‌ها را انتخاب کن.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {periods.map((period) => {
              const isSelected = selectedPeriod === period.id;

              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={cn(
                    "flex items-center justify-between min-h-16 px-4 py-4 rounded-[24px] border transition-all text-right relative bg-white/90 dark:bg-card shadow-sm",
                    isSelected
                      ? "border-primary bg-primary/8 shadow-lg shadow-primary/10"
                      : "border-black/[0.06] dark:border-border hover:border-primary/50"
                  )}
                >
                  {/* Discount Badge */}
                  {period.discount && (
                    <span className="absolute -top-3 left-4 text-xs text-white bg-[#ef1871] px-2.5 py-1 rounded-full font-black shadow-lg shadow-[#ef1871]/20">
                      {period.discount}
                    </span>
                  )}

                  {/* Radio Button and Label */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        isSelected
                          ? "border-primary"
                          : "border-muted-foreground"
                      )}
                    >
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-foreground font-black text-sm">{period.label}</p>
                      <p className="text-muted-foreground font-bold text-xs mt-0.5">{period.label2}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-left">
                    <p className="text-foreground font-black">
                      {formatPrice(period.price)} تومان
                    </p>
                    {period.monthlyPrice && (
                      <span className="text-xs text-muted-foreground">
                        (ماهانه {formatPrice(period.monthlyPrice)} تومان)
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handlePurchase}
          className={cn(
            "w-full py-5 font-black transition-all text-base mt-2 absolute bottom-0 left-0 right-0 z-10",
            "bg-primary text-primary-foreground shadow-2xl shadow-primary/25"
          )}
        >
          خرید رکت‌زون پلاس
        </button>
      </div>
    </BottomSheet>
  );
};

export default ReachLimitPricingSheet;
