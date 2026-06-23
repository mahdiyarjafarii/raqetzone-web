import React, { useLayoutEffect, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom, useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import { XIcon, ChevronRightIcon, ChevronLeftIcon } from "lucide-react";

import { showFeatureTourAtom, featureTourStepAtom, showOnboardingSheetAtom, tourElevateSheetAtom, currentUserAtom } from "@/config/state";
import apiClient from "@/lib/apiClient";
import authStorage from "@/auth/storage";
import { cn } from "@/lib/utils";

const SPOTLIGHT_PADDING = 12;
const SPOTLIGHT_PADDING_OVERRIDES = {
  "tour-nav-tournament": 24,
};

const TOUR_STEPS = [
  {
    key: "welcome",
    emoji: "🎉",
    title: "خوش آمدید!",
    description: "با رکت‌زون می‌توانید به‌سادگی بازی پیدا کنید، تیم بسازید و با دیگر بازیکنان رقابت کنید.",
    targetId: null,
    accent: "#2B0FD9",
    accentLight: "rgba(43,15,217,0.12)",
  },
  {
    key: "matchmaking",
    emoji: "🎾",
    title: "Match Making",
    description: "اگر تیم کامل نداری یا دنبال بازی هستی، از بخش مسابقات استفاده کن تا بازی‌های در حال تشکیل را پیدا کنی یا به آن‌ها ملحق شوی.",
    targetId: "tour-nav-tournament",
    accent: "#22c55e",
    accentLight: "rgba(34,197,94,0.12)",
  },
  {
    key: "tournament",
    emoji: "🏆",
    title: "تورنومنت",
    description: "در تورنومنت‌ها شرکت کن، رقابت کن و جایگاهت را بین سایر بازیکنان ارتقا بده.",
    targetId: "tour-nav-tournament",
    accent: "#f59e0b",
    accentLight: "rgba(245,158,11,0.12)",
  },
  {
    key: "leaderboard",
    emoji: "🥇",
    title: "Leaderboard",
    description: "با انجام بازی و کسب امتیاز، رتبه خودت را در جدول ماهانه بالا ببر و خودت را در بین بهترین‌ها ببین.",
    targetId: null,
    accent: "#eab308",
    accentLight: "rgba(234,179,8,0.12)",
  },
  {
    key: "profile",
    emoji: "👤",
    title: "پروفایل",
    description: "آمار بازی‌ها، امتیازات، Badge‌ها و سوابق کاربری خودت را در پروفایلت مشاهده کن.",
    targetId: "tour-nav-profile",
    accent: "#3b82f6",
    accentLight: "rgba(59,130,246,0.12)",
  },
  {
    key: "booking",
    emoji: "🏟️",
    title: "رزرو زمین",
    description: "از بین صدها زمین تنیس، پدل و اسکواش، زمین مورد نظرت رو انتخاب کن و سریع رزرو کن.",
    targetId: "tour-nav-clubs",
    accent: "#06b6d4",
    accentLight: "rgba(6,182,212,0.12)",
  },
  {
    key: "user-profile",
    emoji: "👆",
    title: "پروفایل بازیکنان",
    description: "روی آواتار هر بازیکن بزن تا مشخصات و سطح بازیش رو ببینی.",
    targetId: "tour-first-player",
    accent: "#ec4899",
    accentLight: "rgba(236,72,153,0.12)",
    onEnter: (navigate) => { navigate("/leaderboard"); },
  },
  {
    key: "send-message",
    emoji: "💬",
    title: "ارسال پیام مستقیم",
    description: "از اینجا می‌تونی مستقیم به هر بازیکنی پیام بدی و باهاش هماهنگ کنی.",
    targetId: "tour-send-message-btn",
    accent: "#ec4899",
    accentLight: "rgba(236,72,153,0.12)",
    highZ: true,
    rectDelay: 750,
    onEnter: () => {
      setTimeout(() => {
        document.getElementById("tour-first-player")?.click();
      }, 300);
    },
  },
  {
    key: "finish",
    emoji: "🎯",
    title: "همه چیز آماده است!",
    description: "حالا اولین بازی خودت را پیدا کن و وارد زمین شو.",
    targetId: null,
    accent: "#2B0FD9",
    accentLight: "rgba(43,15,217,0.12)",
    isFinal: true,
  },
];

function useSpotlightRect(stepIndex) {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    const step = TOUR_STEPS[stepIndex];
    if (!step?.targetId) { setRect(null); return; }

    const update = () => {
      const el = document.getElementById(step.targetId);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      const p = SPOTLIGHT_PADDING_OVERRIDES[step.targetId] ?? SPOTLIGHT_PADDING;
      setRect({
        x: r.left - p,
        y: r.top - p,
        width: r.width + p * 2,
        height: r.height + p * 2,
      });
    };

    const delay = step.rectDelay ?? 0;
    const timer = setTimeout(() => {
      update();
      window.addEventListener("resize", update);
    }, delay);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", update);
    };
  }, [stepIndex]);

  return rect;
}

function getTooltipStyle(spotlightRect, tooltipZ = 10002) {
  const cardWidth = Math.min(340, window.innerWidth - 32);

  if (!spotlightRect) {
    return {
      position: "fixed",
      left: Math.round((window.innerWidth - cardWidth) / 2),
      top: Math.round((window.innerHeight - 380) / 2),
      width: cardWidth,
      zIndex: tooltipZ,
    };
  }

  const centerX = spotlightRect.x + spotlightRect.width / 2;
  const left = Math.max(16, Math.min(Math.round(centerX - cardWidth / 2), window.innerWidth - cardWidth - 16));
  const elementCenterY = spotlightRect.y + spotlightRect.height / 2;

  if (elementCenterY > window.innerHeight / 2) {
    const bottom = Math.round(window.innerHeight - spotlightRect.y + 20);
    return { position: "fixed", left, bottom, width: cardWidth, zIndex: tooltipZ };
  } else {
    const top = Math.round(spotlightRect.y + spotlightRect.height + 20);
    return { position: "fixed", left, top, width: cardWidth, zIndex: tooltipZ };
  }
}

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 20 : 5,
            opacity: i < current ? 0.4 : i === current ? 1 : 0.2,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="h-[5px] rounded-full shrink-0"
          style={{
            background: i <= current
              ? TOUR_STEPS[current].accent
              : "currentColor",
          }}
        />
      ))}
    </div>
  );
}

function TooltipCard({ step, stepIndex, total, spotlightRect, tooltipZ, onNext, onPrev, onSkip, navigate }) {
  const isFirst = stepIndex === 0;
  const isLast = Boolean(step.isFinal);
  const tooltipStyle = getTooltipStyle(spotlightRect, tooltipZ);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.key}
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={tooltipStyle}
        className="rounded-[20px] border border-white/10 dark:border-white/8 overflow-hidden"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glass card */}
        <div
          className="relative bg-white/[0.97] dark:bg-[#1a1a2e]/[0.97] backdrop-blur-2xl"
          style={{ boxShadow: `0 20px 60px -10px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)` }}
        >
          {/* Accent gradient bar at top */}
          <div
            className="h-[3px] w-full"
            style={{ background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)` }}
          />

          <div className="p-5">
            {/* Top row */}
            <div className="flex items-center justify-between mb-4">
              <ProgressDots current={stepIndex} total={total} />
              <button
                onClick={onSkip}
                className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: "rgba(127,127,127,0.1)" }}
                aria-label="رد کردن تور"
              >
                <XIcon size={13} />
              </button>
            </div>

            {/* Emoji badge + content */}
            <div className="text-center mt-2 mb-5">
              <motion.div
                key={step.key + "-emoji"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-[18px] mb-4 text-3xl"
                style={{
                  background: `linear-gradient(135deg, ${step.accentLight}, ${step.accent}22)`,
                  border: `1.5px solid ${step.accent}30`,
                  boxShadow: `0 4px 20px ${step.accent}25`,
                }}
              >
                {step.emoji}
              </motion.div>

              <h3
                className="font-black text-[17px] text-foreground mb-2 leading-tight"
              >
                {step.title}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Actions */}
            {isLast ? (
              <div className="space-y-2.5">
                <button
                  onClick={() => { onNext(); navigate("/tournament"); }}
                  className="w-full h-[50px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform text-white"
                  style={{
                    background: `linear-gradient(135deg, ${step.accent} 0%, #6d28d9 100%)`,
                    boxShadow: `0 6px 20px ${step.accent}45`,
                  }}
                >
                  <span>🎾</span>
                  <span>شروع Match Making</span>
                </button>
                <button
                  onClick={onNext}
                  className="w-full h-9 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                >
                  بزن بریم!
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {!isFirst && (
                  <button
                    onClick={onPrev}
                    className="h-[46px] w-[46px] shrink-0 rounded-2xl flex items-center justify-center text-foreground transition-colors"
                    style={{ background: "rgba(127,127,127,0.1)", border: "1px solid rgba(127,127,127,0.15)" }}
                    aria-label="مرحله قبل"
                  >
                    <ChevronRightIcon size={17} />
                  </button>
                )}
                <motion.button
                  onClick={onNext}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 h-[46px] rounded-2xl font-bold text-[13px] flex items-center justify-center gap-1.5 text-white"
                  style={{
                    background: isFirst
                      ? `linear-gradient(135deg, ${step.accent} 0%, #6d28d9 100%)`
                      : step.accent,
                    boxShadow: `0 4px 16px ${step.accent}40`,
                  }}
                >
                  {isFirst ? (
                    <span>شروع تور 🚀</span>
                  ) : (
                    <>
                      <span>بعدی</span>
                      <ChevronLeftIcon size={14} />
                    </>
                  )}
                </motion.button>
              </div>
            )}

            {/* Step counter */}
            {!isFirst && !isLast && (
              <p className="text-center text-[10px] text-muted-foreground/60 mt-3 tabular-nums">
                {stepIndex} از {total - 2}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function FeatureTour() {
  const [show, setShow] = useAtom(showFeatureTourAtom);
  const [step, setStep] = useAtom(featureTourStepAtom);
  const [onboardingOpen] = useAtom(showOnboardingSheetAtom);
  const setElevateSheet = useSetAtom(tourElevateSheetAtom);
  const setCurrentUser = useSetAtom(currentUserAtom);
  const navigate = useNavigate();
  const spotlightRect = useSpotlightRect(step);

  const currentStep = TOUR_STEPS[Math.min(step, TOUR_STEPS.length - 1)];

  // Run onEnter side-effects and manage sheet elevation per step
  useEffect(() => {
    if (!show) { setElevateSheet(false); return; }
    setElevateSheet(Boolean(currentStep?.highZ));
    if (currentStep?.onEnter) currentStep.onEnter(navigate);
  }, [step, show]);

  // Cleanup on unmount
  useEffect(() => () => setElevateSheet(false), []);

  if (!show || onboardingOpen) return null;

  const accent = currentStep.accent;
  // Steps with highZ need spotlight/tooltip above the elevated sheet (z-10005)
  const spotlightZ = currentStep.highZ ? 10006 : 10001;
  const tooltipZ   = currentStep.highZ ? 10007 : 10002;

  const saveTourCompleted = async () => {
    const token = authStorage.getToken();
    if (!token) return;
    try {
      const res = await apiClient.patch("/users/me", { hasSeenTour: true });
      if (res.data?.user) setCurrentUser((prev) => ({ ...prev, hasSeenTour: true }));
    } catch (_) {}
  };

  const closeTour = async () => {
    setShow(false);
    setStep(0);
    await saveTourCompleted();
  };

  const handleNext = async () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      await closeTour();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <>
      {/* Overlay */}
      {spotlightRect ? (
        <>
          {/* Full-screen click blocker */}
          <div className="fixed inset-0" style={{ zIndex: 10000 }} onClick={(e) => e.stopPropagation()} />

          {/* Spotlight element — box-shadow creates the dark overlay with a transparent "hole" */}
          <motion.div
            animate={{
              x: spotlightRect.x,
              y: spotlightRect.y,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: spotlightZ,
              borderRadius: 16,
              pointerEvents: "none",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
            }}
          />

          {/* Accent glow ring around spotlight */}
          <motion.div
            animate={{
              x: spotlightRect.x - 3,
              y: spotlightRect.y - 3,
              width: spotlightRect.width + 6,
              height: spotlightRect.height + 6,
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: spotlightZ,
              borderRadius: 19,
              pointerEvents: "none",
              border: `2px solid ${accent}`,
              boxShadow: `0 0 16px ${accent}60, inset 0 0 8px ${accent}20`,
            }}
          />

          {/* Pulsing outer ring */}
          <motion.div
            key={step + "-pulse"}
            animate={{
              x: spotlightRect.x - 3,
              y: spotlightRect.y - 3,
              width: spotlightRect.width + 6,
              height: spotlightRect.height + 6,
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: spotlightZ,
              borderRadius: 19,
              pointerEvents: "none",
              border: `2px solid ${accent}`,
              opacity: 0,
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-[inherit]"
              animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ border: `2px solid ${accent}`, borderRadius: "inherit" }}
            />
          </motion.div>
        </>
      ) : (
        <div
          className="fixed inset-0 bg-black/78"
          style={{ zIndex: 10000 }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Tooltip card */}
      <TooltipCard
        step={currentStep}
        stepIndex={step}
        total={TOUR_STEPS.length}
        spotlightRect={spotlightRect}
        tooltipZ={tooltipZ}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={closeTour}
        navigate={navigate}
      />
    </>
  );
}
