import React, { useState, useEffect, useRef } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { X } from "lucide-react";

import {
  showReachLimitPricingSheetAtom,
  hasTitleReachLimitPricingSheetAtom,
  showOverlayLoadingAtom,
  themeAtom,
  reachLimitPricingSheetTriggerSourceAtom,
} from "@/config/state";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import pricingImg from "@/assets/img/pricing-img.png";
import pricingDarkImg from "@/assets/img/pricing-img-dark.png";
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
    label2: "۱۵۰۰ 💎 جم",
    price: basicPlanPrice.monthly,
    discount: null,
  },
  {
    id: "quarterly",
    label: "۳ ماهه",
    label2: "۴۵۰۰ 💎 جم",
    price: basicPlanPrice.quarterly,
    monthlyPrice: monthlyPrices.quarterly,
    // discount: "۳۰٪ تخفیف",
  },
  {
    id: "halfYearly",
    label: "۶ ماهه",
    label2: "۹۰۰۰ 💎 جم",
    price: basicPlanPrice.halfYearly,
    monthlyPrice: monthlyPrices.halfYearly,
    discount: "۲۰٪ تخفیف",
  },
];

const ReachLimitPricingSheet = () => {
  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  const [open, setOpen] = useAtom(showReachLimitPricingSheetAtom);
  const [hasTitle, setHasTitle] = useAtom(hasTitleReachLimitPricingSheetAtom);
  const theme = useAtomValue(themeAtom);
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
      {/* Header with AI Model Icons */}
      <div className="relative overflow-hidden bg-[#FEFEFE] dark:bg-[#0F0F0F] flex flex-col h-[calc(100vh-1.3rem)]">
        <button
          aria-label="بستن"
          onClick={() => setOpen(false)}
          className="absolute top-3 left-3 z-30 p-2 rounded-full dark:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative w-full flex items-center justify-center -px-4">
          {/* Central Myket Logo - Glowing */}
          <img
            src={theme === "dark" ? pricingDarkImg : pricingImg}
            alt="pricing"
            className="w-full object-contain"
          />
        </div>

        <div className="flex flex-col px-8 -mt-2 rounded-t-3xl relative z-10 flex-1 overflow-y-auto pb-24">
          <div className="text-center space-y-2 pt-4">
            <p className="text-lg font-bold text-foreground">
              ChatGPT و ۲۰ مدل هوش مصنوعی‌ دیگر رو <br /> در یک اشتراک بخر!
            </p>
            <p className="text-[15px] text-[#333333] dark:text-gray-400 font-semibold leading-relaxed mt-4">
              با خرید اشتراک به Gemini, Claude, Grok, ChatGPT و مدل‌های پیشرفته
              ساخت تصویر و ویدئو مانند Seadream, Nanobanana و Flux دسترسی پیدا
              کنید.
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {periods.map((period) => {
              const isSelected = selectedPeriod === period.id;

              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={cn(
                    "flex items-center justify-between h-16 px-4 rounded-xl border-2 transition-all text-right relative",
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-border hover:border-blue-300 dark:hover:border-blue-700"
                  )}
                >
                  {/* Discount Badge */}
                  {period.discount && (
                    <span className="absolute -top-3 right-4 text-xs text-white bg-red-500 dark:bg-red-600 px-2 py-0.5 rounded-full font-bold">
                      {period.discount}
                    </span>
                  )}

                  <span className="absolute top-5 -right-8 rotate-90 text-xs text-white bg-blue-500 dark:bg-blue-600 px-4 py-0.5 rounded-full font-bold">
                    {period.label}
                  </span>

                  {/* Radio Button and Label */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-muted-foreground"
                      )}
                    >
                      {isSelected && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-foreground font-medium">
                      {period.label2}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-left">
                    <p className="text-foreground font-bold">
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
            "w-full py-5 font-bold transition-all text-base mt-2 absolute bottom-0 left-0 right-0 z-10",
            "bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
          )}
        >
          خرید اشتراک پلاس
        </button>
      </div>
    </BottomSheet>
  );
};

export default ReachLimitPricingSheet;
