import React, { useState, useEffect, useRef } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";

import { showPricingSheetAtom, pricingSheetTriggerSourceAtom } from "@/config/state";
import {
  MessageSquareIcon,
  ImageIcon,
  VideoIcon,
  UsersIcon,
  GemIcon,
  UploadIcon,
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
      icon: MessageSquareIcon,
      text: "دسترسی به پیشرفته‌ترین مدل‌های Gemini ,ChatGPT, Grok, Claude",
    },
    {
      icon: ImageIcon,
      text: "تولید تصویر  و طراحی حرفه‌ای Seadream ,Nanobana, Flux و سایر مدل‌های پیشرفته",
    },
    {
      icon: VideoIcon,
      text: "تولید ویدئوهای حرفه‌ای با Seadance, Wan و سایر مدل‌های پیشرفته",
    },
    {
      icon: UploadIcon,
      text: "آپلود فایل و عکس و جست‌وجو در اینترنت",
    },
    {
      icon: UsersIcon,
      text: "گفتگو با شخصیت‌ها",
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
      <div className="flex px-4 items-center justify-between sticky top-0 bg-background z-30">
        <p className="text-lg">خرید اشتراک پلاس</p>

        <button
          className="rounded-full hover:bg-muted transition-colors"
          aria-label="بستن"
          onClick={() => setOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col gap-4 px-4 pb-24">
        {/* Free Gems Info */}
        <div className="bg-blue-50 text-muted-foreground space-y-2 dark:bg-blue-950/30 rounded-md p-3 m-2 mt-4">
          <p className="text-center font-semibold text-sm">
            با خرید اشتراک به ChatGPT و همه مدل‌های پیشرفته‌ی هوش مصنوعی برای
            چت، تولید تصویر و ویدیو‌ دسترسی پیدا کن.
          </p>
        </div>
        {/* Period Selection */}
        <div className="mt-1">
          <div className="flex flex-col gap-4 px-2">
            <button
              onClick={() => setSelectedPeriod("monthly")}
              className={cn(
                "flex items-center justify-between py-4 px-2 rounded-lg border-2 transition-all text-right relative",
                selectedPeriod === "monthly"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedPeriod === "monthly"
                      ? "border-blue-500"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedPeriod === "monthly" && (
                    <div
                      className={cn("w-3 h-3 rounded-full", "bg-blue-500")}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-foreground"> ۱ ماهه</span>
                  <span className="text-muted-foreground"> - </span>
                  <span className="">۱۵۰۰ 💎 جم</span>
                </div>
              </div>
              {planBasic.price.monthly && (
                <div className="text-left">
                  <p>{formatPrice(planBasic.price.monthly)} تومان</p>
                </div>
              )}
            </button>

            <button
              onClick={() => setSelectedPeriod("quarterly")}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg border-2 transition-all text-right relative",
                selectedPeriod === "quarterly"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedPeriod === "quarterly"
                      ? "border-blue-500"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedPeriod === "quarterly" && (
                    <div
                      className={cn("w-3 h-3 rounded-full", "bg-blue-500")}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-foreground"> ۳ ماهه</span>
                  <span className="text-muted-foreground"> - </span>
                  <span className="">۴۵۰۰ 💎 جم</span>
                </div>
              </div>
              {planBasic.price.quarterly && (
                <div className="text-left">
                  <p>{formatPrice(planBasic.price.quarterly)} تومان</p>
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
                "flex items-center justify-between p-2 rounded-lg border-2 transition-all text-right relative",
                selectedPeriod === "halfYearly"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="absolute -top-3 left-4 text-xs text-white bg-red-500 dark:bg-red-600 px-2 py-0.5 rounded-lg">
                ۲۰٪ تخفیف
              </span>
              <span className="absolute rotate-90 -right-8 text-[11px] text-white bg-red-500 dark:bg-red-600 px-1.5 rounded-lg">
                پیشنهادی
              </span>
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedPeriod === "halfYearly"
                      ? "border-blue-500"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedPeriod === "halfYearly" && (
                    <div
                      className={cn("w-3 h-3 rounded-full", "bg-blue-500")}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-foreground"> ۶ ماهه</span>
                  <span className="text-muted-foreground"> - </span>
                  <span className="">۹۰۰۰ 💎 جم</span>
                </div>
              </div>
              {planBasic.price.halfYearly && (
                <div className="text-left">
                  <p>{formatPrice(planBasic.price.halfYearly)} تومان</p>
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
          <p className="text-xs text-muted-foreground text-center mt-2">
            قیمت‌ها نهایی و شامل ۱۰٪ مالیات بر ارزش افزوده است.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-4 pt-4">
          {planBasic.features.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <div key={index} className="flex items-center gap-3">
                <div className="flex items-center justify-center bg-primary/10 rounded-md p-2">
                  <FeatureIcon
                    className={cn(
                      "w-5 h-5 mt-0.5 shrink-0",
                      planBasic.gemColor
                    )}
                  />
                </div>

                <div className="flex items-start gap-2 flex-1">
                  <span className="text-[13px] leading-relaxed text-[#333333] dark:text-gray-200">
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
          className={cn(
            "absolute bottom-0 left-0 w-full py-5 font-bold transition-all text-base",
            planBasic.buttonClass
          )}
        >
          خرید اشتراک پلاس
        </button>
      </div>
    </BottomSheet>
  );
};

export default PricingSheet;
