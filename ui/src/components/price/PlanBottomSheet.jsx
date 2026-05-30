import React from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

import "react-spring-bottom-sheet/dist/style.css";

const PlanBottomSheet = ({
  open,
  onDismiss,
  selectedPlanData,
  selectedPeriod,
  onPeriodSelect,
  onConfirmPurchase,
  formatPrice,
}) => {
  if (!selectedPlanData) return null;

  return (
    <BottomSheet
      open={open}
      onDismiss={onDismiss}
      defaultSnap={({ maxHeight }) => maxHeight * 0.9}
      snapPoints={({ maxHeight }) => [maxHeight * 0.9]}
      blocking={true}
      scrollLocking={true}
      className="bottom-sheet"
    >
      <div className="flex px-4 items-center justify-end sticky top-0 bg-background z-30">
        <button
          className="rounded-full hover:bg-muted transition-colors"
          aria-label="بستن"
          onClick={onDismiss}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-6 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-center pt-2 sticky top-0 bg-background z-20">
          <h2 className="text-xl font-bold">انتخاب دوره پرداخت</h2>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            مدت زمان اشتراک{" "}
            <span className="font-bold text-primary">
              {selectedPlanData.name}
            </span>{" "}
            را انتخاب کنید.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onPeriodSelect("monthly")}
            className={cn(
              "flex items-center justify-between py-4 px-2 rounded-xl border-2 transition-all text-right relative",
              selectedPeriod === "monthly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center justify-center gap-3">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedPeriod === "monthly"
                    ? "border-blue-500"
                    : "border-muted-foreground"
                )}
              >
                {selectedPeriod === "monthly" && (
                  <div className={cn("w-3 h-3 rounded-full", "bg-blue-500")} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground">یک ماهه</span>
              </div>
            </div>
            {selectedPlanData.price.monthly && (
              <div className="text-left">
                <p>{formatPrice(selectedPlanData.price.monthly)} تومان</p>
              </div>
            )}
          </button>

          <button
            onClick={() => onPeriodSelect("quarterly")}
            className={cn(
              "flex items-center justify-between p-2 rounded-xl border-2 transition-all text-right relative",
              selectedPeriod === "quarterly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="absolute -top-2 right-4 text-xs text-white bg-red-500 dark:bg-red-600 px-2 py-0.5 rounded">
              ۳۰٪ تخفیف
            </span>
            <div className="flex items-center justify-center gap-3">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedPeriod === "quarterly"
                    ? "border-blue-500"
                    : "border-muted-foreground"
                )}
              >
                {selectedPeriod === "quarterly" && (
                  <div className={cn("w-3 h-3 rounded-full", "bg-blue-500")} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground">سه ماهه</span>
              </div>
            </div>
            {selectedPlanData.price.quarterly && (
              <div className="text-left">
                <p>{formatPrice(selectedPlanData.price.quarterly)} تومان</p>
                <span className="text-xs text-muted-foreground">
                  ( ماهانه {formatPrice(selectedPlanData.price.quarterly / 3)}{" "}
                  تومان )
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => onPeriodSelect("yearly")}
            className={cn(
              "flex items-center justify-between p-2 rounded-xl border-2 transition-all text-right relative",
              selectedPeriod === "yearly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="absolute -top-2 right-4 text-xs text-white bg-red-500 dark:bg-red-600 px-2 py-0.5 rounded">
              ۵۰٪ تخفیف
            </span>
            <div className="flex items-center justify-center gap-3">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedPeriod === "yearly"
                    ? "border-blue-500"
                    : "border-muted-foreground"
                )}
              >
                {selectedPeriod === "yearly" && (
                  <div className={cn("w-3 h-3 rounded-full", "bg-blue-500")} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground">یک ساله</span>
              </div>
            </div>
            {selectedPlanData.price.yearly && (
              <div className="text-left">
                <p>{formatPrice(selectedPlanData.price.yearly)} تومان</p>
                <span className="text-xs text-muted-foreground">
                  ( ماهانه{" "}
                  {formatPrice(Math.round(selectedPlanData.price.yearly / 12))}{" "}
                  تومان ){" "}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Confirm Button */}
        <button
          onClick={onConfirmPurchase}
          className={cn(
            "w-full absolute bottom-0 left-0 right-0 py-3.5 font-bold transition-all text-base mt-2",
            selectedPlanData.buttonClass
          )}
        >
          خرید رکت‌زون پلاس
        </button>
      </div>
    </BottomSheet>
  );
};

export default PlanBottomSheet;
