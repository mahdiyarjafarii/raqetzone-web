import "react-spring-bottom-sheet/dist/style.css";

import React, { useEffect, useState, useRef } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { CameraIcon, MapPinIcon, UserCircleIcon } from "lucide-react";

import { showOnboardingSheetAtom, currentUserAtom } from "@/config/state";
import apiClient from "@/lib/apiClient";
import authStorage from "@/auth/storage";
import { profileService } from "@/features/profile/services/profileService";
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

const WEEKLY_HOURS = [
  { value: "1",  label: "۱ ساعت در هفته",          emoji: "⏱" },
  { value: "2",  label: "۲ ساعت در هفته",          emoji: "⏰" },
  { value: "4",  label: "۳ تا ۴ ساعت در هفته",     emoji: "🕐" },
  { value: "6",  label: "بیشتر از ۵ ساعت در هفته", emoji: "�" },
];

const PROVINCES = [
  "آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "اصفهان", "البرز", "ایلام", "بوشهر",
  "تهران", "چهارمحال و بختیاری", "خراسان جنوبی", "خراسان رضوی", "خراسان شمالی",
  "خوزستان", "زنجان", "سمنان", "سیستان و بلوچستان", "فارس", "قزوین", "قم",
  "کردستان", "کرمان", "کرمانشاه", "کهگیلویه و بویراحمد", "گلستان", "گیلان", "لرستان",
  "مازندران", "مرکزی", "هرمزگان", "همدان", "یزد",
];

const ROLES = [
  { value: "player", label: "بازیکن", desc: "برای بازی، رزرو و شرکت در کلاس", emoji: "🎾" },
  { value: "coach", label: "مربی", desc: "برای برگزاری کلاس و جذب هنرجو", emoji: "🧑‍🏫" },
];

// 0=welcome, 1=profile, 2=role, 3=photo, 4=sport, 5=level, 6=duration
const TOTAL_STEPS = 7;

const getOnboardingUserImage = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return encodeURI(image);
  const encodedImage = image.split("/").map(encodeURIComponent).join("/");
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${encodedImage}`;
};

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

function StepRole({ wantsCoach, onChange }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">🧩</div>
        <h2 className="text-xl font-black text-foreground">نقش شما در رکت‌زون چیه؟</h2>
        <p className="text-muted-foreground text-sm mt-2">در صورت انتخاب مربی، حساب شما بعد از تایید فعال می‌شود</p>
      </div>

      <div className="space-y-2.5">
        {ROLES.map((role) => {
          const selected = wantsCoach ? role.value === "coach" : role.value === "player";
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => onChange(role.value === "coach")}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-right",
                selected ? "border-primary bg-primary/5 shadow-sm shadow-primary/20" : "border-border bg-card"
              )}
            >
              <span className="text-2xl shrink-0">{role.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("font-bold text-sm", selected ? "text-primary" : "text-foreground")}>{role.label}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{role.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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

function StepProfileInfo({ firstName, lastName, city, onFirstNameChange, onLastNameChange, onOpenProvincePicker }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-xl font-black text-foreground">خودت رو معرفی کن</h2>
        <p className="text-muted-foreground text-sm mt-2">نام، نام خانوادگی و شهرت رو وارد کن</p>
      </div>
      <div className="space-y-3">
        <input
          autoFocus
          type="text"
          value={firstName}
          onChange={e => onFirstNameChange(e.target.value)}
          placeholder="نام"
          className="w-full bg-muted border-0 rounded-2xl px-4 py-4 text-center text-lg font-bold text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          maxLength={40}
        />
        <input
          type="text"
          value={lastName}
          onChange={e => onLastNameChange(e.target.value)}
          placeholder="نام خانوادگی"
          className="w-full bg-muted border-0 rounded-2xl px-4 py-4 text-center text-lg font-bold text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          maxLength={60}
        />
        <div className="relative">
          <MapPinIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
          <button
            type="button"
            onClick={onOpenProvincePicker}
            className="w-full bg-muted border-0 rounded-2xl px-4 py-4 pr-11 text-center text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            {city || "انتخاب استان"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProvincePickerSheet({ open, onClose, query, onQueryChange, provinces, onSelect }) {
  return (
    <BottomSheet
      open={open}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.78, 560)]}
      defaultSnap={({ snapPoints }) => snapPoints[0]}
    >
      <div className="px-5 pt-2 pb-8 space-y-3" dir="rtl">
        <h3 className="text-base font-black text-foreground text-center">انتخاب استان</h3>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="جستجو در استان‌ها..."
          className="w-full bg-muted border-0 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="max-h-[48vh] overflow-y-auto space-y-1.5">
          {provinces.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">استانی پیدا نشد</p>
          ) : (
            provinces.map((province) => (
              <button
                key={province}
                type="button"
                onClick={() => onSelect(province)}
                className="w-full rounded-xl bg-muted/60 px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors text-right"
              >
                {province}
              </button>
            ))
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function StepPhoto({ preview, onSelect, uploading, uploadProgress }) {
  const inputRef = useRef(null);

  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">🤳</div>
        <h2 className="text-xl font-black text-foreground">عکس پروفایلت رو بزار</h2>
        <p className="text-muted-foreground text-sm mt-2">
          اختیاریه، ولی پروفایلت رو جذاب‌تر می‌کنه 📸
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

        {uploading && (
          <div className="w-full max-w-xs space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>در حال آپلود تصویر</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepSport({ value, onChange }) {
  const selectedSports = Array.isArray(value) ? value : [value].filter(Boolean);
  const toggleSport = (sport) => {
    onChange(
      selectedSports.includes(sport)
        ? selectedSports.filter((item) => item !== sport)
        : [...selectedSports, sport]
    );
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">🏅</div>
        <h2 className="text-xl font-black text-foreground">چه ورزش‌هایی بازی می‌کنی؟</h2>
        <p className="text-muted-foreground text-sm mt-2">می‌تونی چند گزینه انتخاب کنی</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SPORTS.map(s => {
          const selected = selectedSports.includes(s.value);
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleSport(s.value)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                selected
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/20"
                  : "border-border bg-card"
              )}
            >
              {selected && (
                <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">✓</span>
              )}
              <span className="text-3xl">{s.emoji}</span>
              <span className={cn("font-bold text-sm", selected ? "text-primary" : "text-foreground")}>
                {s.label}
              </span>
            </button>
          );
        })}
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

function StepWeeklyHours({ value, onChange }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-4">⏰</div>
        <h2 className="text-xl font-black text-foreground">معمولاً چقدر در هفته بازی می‌کنی؟</h2>
        <p className="text-muted-foreground text-sm mt-2">به ساعت انتخاب کن</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {WEEKLY_HOURS.map(d => (
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
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [provincePickerOpen, setProvincePickerOpen] = useState(false);
  const [provinceQuery, setProvinceQuery] = useState("");
  const [wantsCoach, setWantsCoach] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [sports, setSports] = useState(["padel"]);
  const [level, setLevel] = useState("beginner");
  const [weeklyHours, setWeeklyHours] = useState("2");
  const [saving, setSaving] = useState(false);

  const isLastStep = step === TOTAL_STEPS - 1;
  const filteredProvinces = PROVINCES.filter((province) =>
    province.includes(provinceQuery.trim())
  );

  useEffect(() => {
    if (!open) return;
    setWantsCoach(Boolean(currentUser?.isCoach));
  }, [open, currentUser?.isCoach]);

  const canNext = () => {
    if (step === 1) return firstName.trim().length >= 2 && lastName.trim().length >= 2 && city.trim().length >= 2;
    if (step === 3) return !photoUploading;
    if (step === 4) return sports.length > 0;
    return true;
  };

  const handlePhotoSelect = async (file) => {
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setPhotoUploading(true);
    setPhotoUploadProgress(0);
    try {
      const startPayload = {
        name: file?.name,
        type: file?.type,
        size: file?.size,
        lastModified: file?.lastModified,
      };
      console.log("Onboarding image upload start:", startPayload);
      sendOnboardingUploadDebugLog("onboarding_upload_start", startPayload);

      const res = await profileService.uploadImage(file, {
        onProgress: (percent) => {
          setPhotoUploadProgress(percent);
        },
      });
      const responsePayload = {
        status: res?.status,
        ok: res.ok,
        data: res.data,
      };
      console.log("Onboarding image upload response:", responsePayload);
      sendOnboardingUploadDebugLog("onboarding_upload_response", responsePayload);

      if (!res.ok || !res.data?.user) {
        toast.error(res.data?.message ?? "خطا در آپلود عکس");
        setPhotoPreview(null);
        return;
      }

      setCurrentUser(res.data.user);
      const uploadedImageUrl = getOnboardingUserImage(res.data.user.image);
      if (uploadedImageUrl) setPhotoPreview(`${uploadedImageUrl}?v=${Date.now()}`);
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
      setPhotoUploadProgress(0);
    }
  };

  const handleNext = async () => {
    if (!isLastStep) { setStep(s => s + 1); return; }

    setSaving(true);
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const displayName = `${trimmedFirstName} ${trimmedLastName}`.trim();
    const { ok, data } = await apiClient.patch("/users/me", {
      name: displayName,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      city: city.trim(),
      isCoach: wantsCoach,
      favoriteSport: sports[0],
      skillLevel: level,
    });
    setSaving(false);
    if (!ok) return toast.error("خطا در ذخیره اطلاعات");
    if (data?.user) setCurrentUser(data.user);

    const fireConfetti = () => {
      const colors = ["#2B0FD9", "#ef1871", "#22c55e", "#f59e0b", "#ec4899", "#3b82f6"];
      confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 }, colors });
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.5, x: 0.3 }, angle: 60, colors });
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.5, x: 0.7 }, angle: 120, colors });
    };
    fireConfetti();
    setTimeout(fireConfetti, 400);

    setTimeout(() => setOpen(false), 2200);
    toast.success(
      wantsCoach
        ? `خوش اومدی ${trimmedFirstName} 🎉 درخواست مربی‌بودن ثبت شد`
        : `خوش اومدی ${trimmedFirstName} 🎉`
    );
  };

  const btnLabel = () => {
    if (step === 0) return "شروع کن 🚀";
    if (step === 3) return photoUploading ? "در حال آپلود..." : "ادامه";
    if (isLastStep) return saving ? "در حال ذخیره..." : "بزن بریم! 🎉";
    return "بعدی";
  };

  return (
    <>
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
            {step === 1 && (
              <StepProfileInfo
                firstName={firstName}
                lastName={lastName}
                city={city}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
                onOpenProvincePicker={() => setProvincePickerOpen(true)}
              />
            )}
            {step === 2 && <StepRole wantsCoach={wantsCoach} onChange={setWantsCoach} />}
            {step === 3 && (
              <StepPhoto
                preview={photoPreview}
                onSelect={handlePhotoSelect}
                uploading={photoUploading}
                uploadProgress={photoUploadProgress}
              />
            )}
            {step === 4 && <StepSport value={sports} onChange={setSports} />}
            {step === 5 && <StepLevel value={level} onChange={setLevel} />}
            {step === 6 && <StepWeeklyHours value={weeklyHours} onChange={setWeeklyHours} />}
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

      <ProvincePickerSheet
        open={provincePickerOpen}
        onClose={() => {
          setProvincePickerOpen(false);
          setProvinceQuery("");
        }}
        query={provinceQuery}
        onQueryChange={setProvinceQuery}
        provinces={filteredProvinces}
        onSelect={(province) => {
          setCity(province);
          setProvincePickerOpen(false);
          setProvinceQuery("");
        }}
      />
    </>
  );
}
