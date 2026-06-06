import "react-spring-bottom-sheet/dist/style.css";

import React, { useState, useRef } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import toast from "react-hot-toast";
import { CameraIcon, UserCircleIcon } from "lucide-react";

import { showOnboardingSheetAtom, currentUserAtom } from "@/config/state";
import apiClient from "@/lib/apiClient";
import authStorage from "@/auth/storage";
import { cn } from "@/lib/utils";

// ── data ──────────────────────────────────────────────────────────────────────

const SPORTS = [
  { value: "padel",     label: "پدل",     emoji: "🏓" },
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
  { value: "60",  label: "۱ ساعت",          emoji: "⏱" },
  { value: "90",  label: "۱.۵ ساعت",        emoji: "⏱" },
  { value: "120", label: "۲ ساعت",          emoji: "⏰" },
  { value: "180", label: "بیشتر از ۲ ساعت", emoji: "🕐" },
];

// 0=welcome, 1=name, 2=photo, 3=sport, 4=level, 5=duration
const TOTAL_STEPS = 6;
const MAX_ONBOARDING_IMAGE_SIZE_MB = 5;
const MAX_ONBOARDING_IMAGE_SIZE_BYTES = MAX_ONBOARDING_IMAGE_SIZE_MB * 1024 * 1024;

const sendOnboardingUploadDebugLog = async (event, payload = {}) => {
  try {
    const token = authStorage.getToken();
    await fetch(`${import.meta.env.VITE_WEBSITE_URL}/api/users/upload-image/debug-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token ?? "",
      },
      body: JSON.stringify({
        source: "onboarding",
        event,
        payload,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        online: navigator.onLine,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Onboarding image debug log failed:", error);
  }
};

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

function StepPhoto({ preview, onSelect, uploading }) {
  const inputRef = useRef(null);

  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">🤳</div>
        <h2 className="text-xl font-black text-foreground">عکس پروفایلت رو بزار</h2>
        <p className="text-muted-foreground text-sm mt-2">
          برای ادامه انتخاب عکس الزامیه 📸
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Avatar preview */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-dashed border-primary/40 bg-muted flex items-center justify-center active:scale-95 transition-all"
        >
          {preview ? (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <UserCircleIcon className="w-16 h-16 text-muted-foreground/40" />
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
            <CameraIcon className="w-6 h-6 text-white" />
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,image/avif,image/bmp,image/tiff"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/10 text-primary text-sm font-semibold active:scale-95 transition-all"
        >
          <CameraIcon className="w-4 h-4" />
          {uploading ? "در حال آپلود..." : preview ? "عوض کردن عکس" : "انتخاب عکس"}
        </button>
      </div>
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
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [sport, setSport] = useState("padel");
  const [level, setLevel] = useState("beginner");
  const [duration, setDuration] = useState("90");
  const [saving, setSaving] = useState(false);

  const isLastStep = step === TOTAL_STEPS - 1;

  const canNext = () => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return !!photoPreview && !photoUploading;
    return true;
  };

  const handlePhotoSelect = async (file) => {
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setPhotoUploading(true);
    try {
      const startPayload = {
        name: file?.name,
        type: file?.type,
        size: file?.size,
        lastModified: file?.lastModified,
      };
      console.log("Onboarding image upload start:", startPayload);
      sendOnboardingUploadDebugLog("onboarding_upload_start", startPayload);

      if (file?.size > MAX_ONBOARDING_IMAGE_SIZE_BYTES) {
        const message = `حجم عکس نباید بیشتر از ${MAX_ONBOARDING_IMAGE_SIZE_MB} مگابایت باشد`;
        sendOnboardingUploadDebugLog("onboarding_upload_rejected_client_size", {
          ...startPayload,
          maxSizeMb: MAX_ONBOARDING_IMAGE_SIZE_MB,
        });
        toast.error(message);
        setPhotoPreview(null);
        return;
      }

      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${import.meta.env.VITE_WEBSITE_URL}/api/users/upload-image`, {
        method: "POST",
        headers: { "x-auth-token": authStorage.getToken() ?? "" },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      const responsePayload = {
        status: res.status,
        ok: res.ok,
        data,
      };
      console.log("Onboarding image upload response:", responsePayload);
      sendOnboardingUploadDebugLog("onboarding_upload_response", responsePayload);

      if (res.status === 413 && !data?.message) {
        toast.error(`حجم عکس نباید بیشتر از ${MAX_ONBOARDING_IMAGE_SIZE_MB} مگابایت باشد`);
        setPhotoPreview(null);
        return;
      }

      if (!res.ok) {
        toast.error(data?.message ?? "خطا در آپلود عکس");
        setPhotoPreview(null);
      } else if (data?.user) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error("Onboarding image upload failed:", error);
      sendOnboardingUploadDebugLog("onboarding_upload_failed", {
        message: error?.message,
        name: error?.name,
      });
      toast.error("خطا در اتصال");
      setPhotoPreview(null);
    } finally {
      setPhotoUploading(false);
    }
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

  const btnLabel = () => {
    if (step === 0) return "شروع کن 🚀";
    if (step === 2) return photoUploading ? "در حال آپلود..." : photoPreview ? "ادامه" : "عکس پروفایل الزامی است";
    if (isLastStep) return saving ? "در حال ذخیره..." : "بزن بریم! 🎉";
    return "بعدی";
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
            {step === 2 && (
              <StepPhoto
                preview={photoPreview}
                onSelect={handlePhotoSelect}
                uploading={photoUploading}
              />
            )}
            {step === 3 && <StepSport value={sport} onChange={setSport} />}
            {step === 4 && <StepLevel value={level} onChange={setLevel} />}
            {step === 5 && <StepDuration value={duration} onChange={setDuration} />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 space-y-3">
          <button
            onClick={handleNext}
            disabled={!canNext() || saving || photoUploading}
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-base transition-all",
              canNext() && !saving && !photoUploading
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {btnLabel()}
          </button>

          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={saving || photoUploading}
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
