import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2Icon, CircleIcon, GiftIcon, ChevronLeftIcon } from "lucide-react";

export default function SpinWheelSection({ milestones = [], onOpenSpin }) {
  const eligible = milestones.filter((m) => m.canSpin);
  const hasEligible = eligible.length > 0;

  return (
    <div className="px-4" dir="rtl">
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-l from-[#2b0fd9] to-[#ef1871] p-4">
          <div className="pointer-events-none absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)" }} />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs font-medium mb-0.5">چالش‌های رکت‌زون</p>
              <h3 className="text-white text-base font-black">چرخ شانس 🎡</h3>
              <p className="text-white/70 text-xs mt-1">با انجام چالش‌ها، جایزه بگیر!</p>
            </div>
            <div className="text-4xl">🎁</div>
          </div>
        </div>

        {/* Milestones */}
        <div className="p-3 space-y-2">
          {milestones.map((m) => (
            <div
              key={m.key}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                m.canSpin
                  ? "bg-gradient-to-l from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200/50 dark:border-purple-800/30"
                  : m.spun
                  ? "bg-muted/40"
                  : "bg-muted/20"
              }`}
            >
              <span className="text-xl flex-shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${m.spun ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {m.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.description}</p>
              </div>
              <div className="flex-shrink-0">
                {m.spun ? (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">دریافت شد</span>
                ) : m.achieved ? (
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <CheckCircle2Icon className="w-3.5 h-3.5" />
                    آماده!
                  </span>
                ) : (
                  <CircleIcon className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-3 pb-3">
          <button
            onClick={onOpenSpin}
            disabled={!hasEligible}
            className={`w-full rounded-xl py-3 text-sm font-black flex items-center justify-center gap-2 transition-all ${
              hasEligible
                ? "bg-gradient-to-l from-[#2b0fd9] to-[#ef1871] text-white shadow-md shadow-purple-500/20 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <GiftIcon className="w-4 h-4" />
            {hasEligible ? `${eligible.length} جایزه آماده دریافته!` : "هنوز جایزه‌ای نداری"}
            {hasEligible && <ChevronLeftIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
