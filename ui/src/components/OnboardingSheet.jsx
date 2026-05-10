import "react-spring-bottom-sheet/dist/style.css";

import React, { useState } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import toast from "react-hot-toast";

import { showOnboardingSheetAtom, currentUserAtom } from "@/config/state";
import apiClient from "@/lib/apiClient";
import { cn } from "@/lib/utils";

// ── data ──────────────────────────────────────────────────────────────────────

const SPORTS = [
  { value: "padel",     label: "پادل",     emoji: "🏓" },
  { value: "tennis",    label: "تنیس",     emoji: "🎾" },
  { value: "squash",    label: "اسکواش",   emoji: "🟡" },
  { value: "badminton", label: "بدمینتون", emoji: "🏸" },
];

const LEVELS = [
  { value: "beginner",     label: "مبتدی",    desc: "تازه شروع کرده‌ام",        emoji: "🌱" },
  { value: "intermediate", label: "متوسط",    desc: "چند سالی تجربه دارم",      emoji: "⚡" },
  { value: "advanced",     label: "پیشرفته",  desc: "رقابتی بازی می‌کنم",       emoji: "🔥" },
  { value: "pro",          label: "حرفه‌ای",  desc: "سطح فدراسیونی",            emoji: "🏆" },
];

const DURATIONS = [
  { value: "60",  label: "۱ ساعت",        emoji: "⏱" },
  { value: "90",  label: "۱.۵ ساعت",      emoji: "⏱" },
  { value: "120", label: "۲ ساعت",        emoji: "⏰" },
  { value: "180", label: "بیشتر از ۲ ساعت", emoji: "🕐" },
];

const TOTAL_STEPS = 5; // welcome, name, sport, level, duration

// ── Steps ─────────────────────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="text-center space-y-5 py-4">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="text-6xl"
      >
        🎾
      </motion.div>
      <div>
        <h2 className="text-2xl font-black text-foreground leading-snug">
          به رکت‌زون خوش اومدی!
        </h2>
        <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-xs mx-auto">
          جایی که رزرو زمین، پیدا کردن حریف و بهبود بازیت همه یه‌جاست.
        </p>
      </div>
      <div className="flex justify-center gap-6 pt-2">
        {["🏟️ رزرو زمین", "🤝 پیدا کردن حریف", "📊 پیشرفت بازی"].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-xs text-muted-foreground font-medium">{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StepName({ value, onChange }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-xl font-black text-foreground">اسمت چیه؟</h2>
        <p className="text-muted-foreground text-sm mt-2">با چه اسمی صدات کنیم؟</p>
      </div>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="اسم یا نام مستعار"
        className="w-full bg-muted border-0 rounded-2xl px-4 py-4 text-center text-lg font-bold text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        maxLength={40}
      />
    </div>
  );
}

function StepSport({ value, onChange }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">🏅</div>
        <h2 className="text-xl font-black text-foreground">رشته اصلیت چیه؟</h2>
        <p className="text-muted-foreground text-sm mt-2">می‌تونی بعداً عوضش کنی</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SPORTS.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              value === s.value
                ? "border-primary bg-primary/5 shadow-sm shadow-primary/20"
                : "border-border bg-card"
            )}
          >
            <span className="text-3xl">{s.emoji}</span>
            <span className={cn("font-bold text-sm", value === s.value ? "text-primary" : "text-foreground")}>
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepLevel({ value, onChange }) {
  return (
    <div className="space-y-5 text-center">
      <div>
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-xl font-black text-foreground">سطح بازیت چقدره؟</h2>
        <p className="text-muted-foreground text-sm mt-2">صادقانه انتخاب کن 😄</p>
      </div>
      <div className="space-y-2.5">
        {LEVELS.map(l => (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-right",
              value === l.value
                ? "border-primary bg-primary/5 shadow-sm shadow-primary/20"
                : "border-border bg-card"
            )}
          >
            <span className="text-2xl shrink-0">{l.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={cn("font-bold text-sm", value === l.value ? "text-primary" : "text-foreground")}>
                {l.label}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">{l.desc}</p>
            </div>
            {value === l.value && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDuration({ value, onChange }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">⏰</div>
        <h2 className="text-xl font-black text-foreground">هر بار چقدر بازی می‌کنی؟</h2>
        <p className="text-muted-foreground text-sm mt-2">معمولاً هر جلسه چه مدته؟</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {DURATIONS.map(d => (
          <button
            key={d.value}
            type="button"
            onClick={() => onChange(d.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              value === d.value
                ? "border-primary bg-primary/5 shadow-sm shadow-primary/20"
                : "border-border bg-card"
            )}
          >
            <span className="text-3xl">{d.emoji}</span>
            <span className={cn("font-bold text-sm", value === d.value ? "text-primary" : "text-foreground")}>
              {d.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────────

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 24 : 8, opacity: i <= current ? 1 : 0.3 }}
          transition={{ duration: 0.25 }}
          className={cn("h-2 rounded-full", i <= current ? "bg-primary" : "bg-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OnboardingSheet() {
  const [open, setOpen] = useAtom(showOnboardingSheetAtom);
  const [, setCurrentUser] = useAtom(currentUserAtom);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("padel");
  const [level, setLevel] = useState("beginner");
  const [duration, setDuration] = useState("90");
  const [saving, setSaving] = useState(false);

  const isLastStep = step === TOTAL_STEPS - 1;
  const canNext = step === 1 ? name.trim().length >= 2 : true;

  const btnLabel = () => {
    if (step === 0) return "شروع کن 🚀";
    if (isLastStep) return saving ? "در حال ذخیره..." : "بزن بریم! 🎉";
    return "بعدی";
  };

  const handleNext = async () => {
    if (!isLastStep) { setStep(s => s + 1); return; }

    setSaving(true);
    const { ok, data } = await apiClient.patch("/users/me", {
      name: name.trim(),
      favoriteSport: sport,
      skillLevel: level,
    });
    setSaving(false);
    if (!ok) return toast.error("خطا در ذخیره اطلاعات");
    if (data?.user) setCurrentUser(data.user);
    setOpen(false);
    toast.success(`خوش اومدی ${name.trim()} 🎉`);
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={() => {}}
      blocking
      snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.88, 640)]}
      defaultSnap={({ snapPoints }) => snapPoints[0]}
    >
      <div className="px-5 pt-2 pb-10">
        <ProgressDots current={step} total={TOTAL_STEPS} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}
          >
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepName value={name} onChange={setName} />}
            {step === 2 && <StepSport value={sport} onChange={setSport} />}
            {step === 3 && <StepLevel value={level} onChange={setLevel} />}
            {step === 4 && <StepDuration value={duration} onChange={setDuration} />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 space-y-3">
          <button
            onClick={handleNext}
            disabled={!canNext || saving}
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-base transition-all",
              canNext && !saving
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {btnLabel()}
          </button>

          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={saving}
              className="w-full h-10 text-sm text-muted-foreground"
            >
              برگشت
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
