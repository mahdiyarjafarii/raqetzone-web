import React, { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { BottomSheet } from "react-spring-bottom-sheet";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Clock3Icon,
  MessageSquareIcon,
  PlusIcon,
  SendIcon,
  StarIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
  UserRoundPenIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  DumbbellIcon,
  CheckIcon,
  BadgeCheckIcon,
} from "lucide-react";

import { currentUserAtom } from "@/config/state";
import { cn } from "@/lib/utils";
import { coachService } from "@/services/coachService";
import apiClient from "@/lib/apiClient";
import {
  addDaysToDateKey,
  formatPersianDateInTehran,
  formatDateKeyInTehran,
  parseDateKeyAsUTCNoon,
  getTodayDateKeyInTehran,
} from "@/lib/timezone";

import "react-spring-bottom-sheet/dist/style.css";

const PERSIAN_WEEKDAYS = [
  { label: "ش", fullLabel: "شنبه", utcDay: 6 },
  { label: "ی", fullLabel: "یکشنبه", utcDay: 0 },
  { label: "د", fullLabel: "دوشنبه", utcDay: 1 },
  { label: "س", fullLabel: "سه‌شنبه", utcDay: 2 },
  { label: "چ", fullLabel: "چهارشنبه", utcDay: 3 },
  { label: "پ", fullLabel: "پنجشنبه", utcDay: 4 },
  { label: "ج", fullLabel: "جمعه", utcDay: 5 },
];

const initialClassForm = {
  title: "",
  description: "",
  sportType: "padel",
  city: "",
  level: "all",
  venueMode: "platform",
  clubId: "",
  courtId: "",
  customLocation: "",
  customCourtName: "",
  price: "",
  capacity: "",
  schedStartDate: getTodayDateKeyInTehran(),
  sessionCount: 8,
  schedWeekdays: [],
  schedStartTime: "18:00",
};

const LEVEL_OPTIONS = [
  { value: "all", label: "همه سطوح", emoji: "✨" },
  { value: "beginner", label: "مبتدی", emoji: "🌱" },
  { value: "intermediate", label: "متوسط", emoji: "⚡" },
  { value: "advanced", label: "پیشرفته", emoji: "🔥" },
];

const SPORT_OPTIONS = [
  { value: "padel", label: "پدل", icon: "🥎" },
  { value: "tennis", label: "تنیس", icon: "🎾" },
  { value: "squash", label: "اسکواش", icon: "🟡" },
  { value: "badminton", label: "بدمینتون", icon: "🏸" },
];

const STEPS = [
  { id: 1, title: "ورزش و عنوان" },
  { id: 2, title: "قیمت و ظرفیت" },
  { id: 3, title: "محل برگزاری" },
  { id: 4, title: "زمان‌بندی" },
  { id: 5, title: "تأیید نهایی" },
];

function computeEndTime(startTime) {
  const [h, m] = startTime.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateSessionsByCount(form, venuePayload) {
  const { schedStartDate, schedWeekdays, schedStartTime, sessionCount } = form;
  if (!schedStartDate || schedWeekdays.length === 0 || !schedStartTime || !sessionCount) return [];
  const start = parseDateKeyAsUTCNoon(schedStartDate);
  if (!start) return [];
  const endTime = computeEndTime(schedStartTime);
  const sessions = [];
  const cur = new Date(start);
  while (sessions.length < Number(sessionCount)) {
    if (schedWeekdays.includes(cur.getUTCDay())) {
      sessions.push({ date: formatDateKeyInTehran(cur), startTime: schedStartTime, endTime, ...venuePayload });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (sessions.length > 200) break;
  }
  return sessions;
}

const DATE_OPTIONS = Array.from({ length: 120 }, (_, index) => {
  const value = addDaysToDateKey(getTodayDateKeyInTehran(), index);
  return {
    value,
    label: formatPersianDateInTehran(value, {
      weekday: "short",
      month: "long",
      day: "numeric",
    }),
  };
});

const TIME_OPTIONS = Array.from({ length: 48 }, (_, idx) => {
  const hour = String(Math.floor(idx / 2)).padStart(2, "0");
  const minute = idx % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

function getUserFullName(user) {
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const lastName = typeof user?.lastName === "string" ? user.lastName.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user?.name || "کاربر";
}

function getProfileImage(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

function getClassVenue(cls) {
  const loc = cls.location;
  if (loc) return loc;
  const s = Array.isArray(cls.sessions) ? cls.sessions[0] : null;
  if (!s) return null;
  if (s.venueMode === "custom") return [s.location, s.courtName].filter(Boolean).join(" · ");
  return [s.clubName, s.courtName].filter(Boolean).join(" · ") || null;
}

const CLASS_STATUS_META = {
  active: { label: "فعال", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  completed: { label: "تکمیل شده", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  cancelled: { label: "لغو شده", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        return (
          <div
            key={step}
            className={cn(
              "rounded-full transition-all duration-300",
              isActive ? "w-6 h-2 bg-primary" : isDone ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-border"
            )}
          />
        );
      })}
    </div>
  );
}

// ─── Create Class Multi-Step Sheet ───────────────────────────────────────────
function CreateClassSheet({ open, onClose, clubs, clubsLoading, onSubmit, creating }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialClassForm);
  const [classSessions, setClassSessions] = useState([]);

  const selectedClub = useMemo(() => clubs.find((item) => item.id === form.clubId) ?? null, [clubs, form.clubId]);
  const availableCourts = useMemo(
    () => (selectedClub?.courts ?? []).filter((court) => court.isActive !== false),
    [selectedClub]
  );

  useEffect(() => {
    if (!open) {
      setStep(1);
      setForm(initialClassForm);
      setClassSessions([]);
    }
  }, [open]);

  useEffect(() => {
    const venuePayload =
      form.venueMode === "platform"
        ? {
            venueMode: "platform",
            clubId: form.clubId,
            courtId: form.courtId,
            clubName: selectedClub?.name || "",
            courtName: availableCourts.find((c) => c.id === form.courtId)?.name || "",
          }
        : {
            venueMode: "custom",
            location: form.customLocation.trim(),
            courtName: form.customCourtName.trim(),
          };
    setClassSessions(generateSessionsByCount(form, venuePayload));
  }, [
    form.schedStartDate, form.sessionCount, form.schedWeekdays, form.schedStartTime,
    form.venueMode, form.clubId, form.courtId, form.customLocation, form.customCourtName,
    selectedClub, availableCourts,
  ]);

  const setF = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const canGoNext = () => {
    if (step === 1) return form.title.trim().length > 0;
    if (step === 2) return form.price !== "" && form.capacity !== "";
    if (step === 3) {
      if (form.venueMode === "platform") return form.clubId && form.courtId;
      return form.customLocation.trim().length > 0;
    }
    if (step === 4) return form.schedWeekdays.length > 0 && classSessions.length > 0;
    return true;
  };

  const handleSubmit = () => {
    onSubmit(form, classSessions);
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.92, 780)]}
    >
      <div className="bg-background text-foreground flex flex-col" style={{ minHeight: "72vh" }} dir="rtl">
        {/* Header */}
        <div className="px-4 pt-2 pb-0 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-black text-foreground">
              {STEPS[step - 1]?.title}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-border flex items-center justify-center"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          <StepIndicator currentStep={step} totalSteps={5} />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
            >
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">نوع ورزش</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SPORT_OPTIONS.map((option) => {
                        const active = form.sportType === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setF({ sportType: option.value })}
                            className={cn(
                              "h-14 rounded-2xl border text-sm font-bold transition flex items-center justify-center gap-2",
                              active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"
                            )}
                          >
                            <span className="text-xl">{option.icon}</span>
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">عنوان کلاس</p>
                    <input
                      value={form.title}
                      onChange={(e) => setF({ title: e.target.value })}
                      placeholder="مثلاً: کلاس پدل مقدماتی"
                      className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">توضیحات (اختیاری)</p>
                    <textarea
                      value={form.description}
                      onChange={(e) => setF({ description: e.target.value })}
                      placeholder="اطلاعات بیشتر درباره کلاس..."
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">سطح کلاس</p>
                    <div className="grid grid-cols-2 gap-2">
                      {LEVEL_OPTIONS.map((option) => {
                        const active = form.level === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setF({ level: option.value })}
                            className={cn(
                              "h-11 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5",
                              active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"
                            )}
                          >
                            <span>{option.emoji}</span>
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">شهر</p>
                    <input
                      value={form.city}
                      onChange={(e) => setF({ city: e.target.value })}
                      placeholder="مثلاً: تهران"
                      className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">قیمت هر نفر</p>
                    <div className="relative">
                      <input
                        value={form.price}
                        onChange={(e) => setF({ price: e.target.value })}
                        placeholder="مبلغ به تومان"
                        inputMode="numeric"
                        className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary pl-16"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">تومان</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">برای کلاس رایگان عدد ۰ بذار</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">ظرفیت کلاس</p>
                    <div className="relative">
                      <input
                        value={form.capacity}
                        onChange={(e) => setF({ capacity: e.target.value })}
                        placeholder="تعداد نفر"
                        inputMode="numeric"
                        className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary pl-16"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">نفر</span>
                    </div>
                  </div>

                  {/* Summary card */}
                  <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                    <p className="text-xs font-black text-primary">خلاصه تا اینجا</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>ورزش: <span className="font-bold text-foreground">{SPORT_OPTIONS.find(s => s.value === form.sportType)?.label}</span></p>
                      <p>عنوان: <span className="font-bold text-foreground">{form.title || "—"}</span></p>
                      <p>سطح: <span className="font-bold text-foreground">{LEVEL_OPTIONS.find(l => l.value === form.level)?.label}</span></p>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-muted/50 p-1 flex">
                    <button
                      type="button"
                      onClick={() => setF({ venueMode: "platform", customLocation: "", customCourtName: "" })}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-xs font-bold transition",
                        form.venueMode === "platform" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      باشگاه‌های سیستم
                    </button>
                    <button
                      type="button"
                      onClick={() => setF({ venueMode: "custom", clubId: "", courtId: "" })}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-xs font-bold transition",
                        form.venueMode === "custom" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      محل دلخواه
                    </button>
                  </div>

                  {form.venueMode === "platform" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground">انتخاب باشگاه</p>
                        <select
                          value={form.clubId}
                          onChange={(e) => setF({ clubId: e.target.value, courtId: "" })}
                          className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm"
                        >
                          <option value="">{clubsLoading ? "در حال بارگذاری..." : "باشگاه را انتخاب کنید"}</option>
                          {clubs.map((club) => (
                            <option key={club.id} value={club.id}>{club.name}</option>
                          ))}
                        </select>
                      </div>

                      {form.clubId && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground">انتخاب زمین</p>
                          <select
                            value={form.courtId}
                            onChange={(e) => setF({ courtId: e.target.value })}
                            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm"
                          >
                            <option value="">زمین را انتخاب کنید</option>
                            {availableCourts.map((court) => (
                              <option key={court.id} value={court.id}>{court.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {form.clubId && form.courtId && (
                        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-emerald-600" />
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {selectedClub?.name} · {availableCourts.find(c => c.id === form.courtId)?.name}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground">آدرس محل برگزاری</p>
                        <input
                          value={form.customLocation}
                          onChange={(e) => setF({ customLocation: e.target.value })}
                          placeholder="مثلاً: تهران، پارک لاله"
                          className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground">نام زمین (اختیاری)</p>
                        <input
                          value={form.customCourtName}
                          onChange={(e) => setF({ customCourtName: e.target.value })}
                          placeholder="مثلاً: زمین شماره ۳"
                          className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">روزهای هفته</p>
                    <div className="flex gap-1.5 justify-between">
                      {PERSIAN_WEEKDAYS.map((day) => {
                        const active = form.schedWeekdays.includes(day.utcDay);
                        return (
                          <button
                            key={day.utcDay}
                            type="button"
                            onClick={() =>
                              setF({
                                schedWeekdays: active
                                  ? form.schedWeekdays.filter((d) => d !== day.utcDay)
                                  : [...form.schedWeekdays, day.utcDay],
                              })
                            }
                            title={day.fullLabel}
                            className={cn(
                              "flex-1 h-10 rounded-xl border text-xs font-black transition",
                              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                            )}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    {form.schedWeekdays.length > 0 && (
                      <p className="text-[11px] text-primary font-bold">
                        {form.schedWeekdays.map(d => PERSIAN_WEEKDAYS.find(w => w.utcDay === d)?.fullLabel).filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">تاریخ شروع</p>
                      <select
                        value={form.schedStartDate}
                        onChange={(e) => setF({ schedStartDate: e.target.value })}
                        className="h-12 w-full rounded-2xl border border-border bg-card px-3 text-xs"
                      >
                        {DATE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">ساعت شروع</p>
                      <select
                        value={form.schedStartTime}
                        onChange={(e) => setF({ schedStartTime: e.target.value })}
                        className="h-12 w-full rounded-2xl border border-border bg-card px-3 text-xs"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">تعداد جلسات</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setF({ sessionCount: Math.max(1, Number(form.sessionCount) - 1) })}
                        className="w-12 h-12 rounded-2xl border border-border bg-card flex items-center justify-center text-lg font-black text-foreground"
                      >
                        −
                      </button>
                      <div className="flex-1 h-12 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-center">
                        <span className="text-2xl font-black text-primary">{form.sessionCount}</span>
                        <span className="text-xs text-primary/70 mr-1.5 mt-1">جلسه</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setF({ sessionCount: Math.min(100, Number(form.sessionCount) + 1) })}
                        className="w-12 h-12 rounded-2xl border border-border bg-card flex items-center justify-center text-lg font-black text-foreground"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {[4, 8, 12, 16, 24].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setF({ sessionCount: n })}
                          className={cn(
                            "flex-1 h-8 rounded-xl text-xs font-bold border transition",
                            form.sessionCount === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sessions preview */}
                  {classSessions.length > 0 ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                          {classSessions.length} جلسه تولید شد
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatPersianDateInTehran(classSessions[0].date, { month: "short", day: "numeric" })}
                          {" — "}
                          {formatPersianDateInTehran(classSessions[classSessions.length - 1].date, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {classSessions.map((session, idx) => (
                          <div
                            key={`${session.date}-${idx}`}
                            className="text-[11px] text-muted-foreground flex items-center justify-between"
                          >
                            <span>{formatPersianDateInTehran(session.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                            <span className="font-bold text-foreground">{session.startTime}–{session.endTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : form.schedWeekdays.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-center">
                      <p className="text-xs text-muted-foreground">روزهای هفته را انتخاب کن تا جلسات تولید بشن</p>
                    </div>
                  ) : null}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <p className="text-sm font-black text-foreground">خلاصه کلاس</p>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">ورزش</span>
                        <span className="font-bold text-foreground text-xs">
                          {SPORT_OPTIONS.find(s => s.value === form.sportType)?.icon} {SPORT_OPTIONS.find(s => s.value === form.sportType)?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">عنوان</span>
                        <span className="font-bold text-foreground text-xs">{form.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">سطح</span>
                        <span className="font-bold text-foreground text-xs">{LEVEL_OPTIONS.find(l => l.value === form.level)?.emoji} {LEVEL_OPTIONS.find(l => l.value === form.level)?.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">شهر</span>
                        <span className="font-bold text-foreground text-xs">{form.city || "نامشخص"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">قیمت</span>
                        <span className="font-bold text-foreground text-xs">
                          {Number(form.price) > 0 ? `${Number(form.price).toLocaleString("fa-IR")} تومان` : "رایگان"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">ظرفیت</span>
                        <span className="font-bold text-foreground text-xs">{form.capacity} نفر</span>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">محل برگزاری</span>
                        <span className="font-bold text-foreground text-xs">
                          {form.venueMode === "platform"
                            ? selectedClub?.name || "باشگاه انتخاب شده"
                            : form.customLocation || "آدرس دلخواه"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">تعداد جلسات</span>
                        <span className="font-bold text-primary text-xs">{classSessions.length} جلسه</span>
                      </div>
                      {classSessions.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">بازه زمانی</span>
                          <span className="font-bold text-foreground text-xs">
                            {formatPersianDateInTehran(classSessions[0].date, { month: "short", day: "numeric" })}
                            {" تا "}
                            {formatPersianDateInTehran(classSessions[classSessions.length - 1].date, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">ساعت</span>
                        <span className="font-bold text-foreground text-xs">{form.schedStartTime} – {computeEndTime(form.schedStartTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="px-4 pb-6 pt-3 border-t border-border/50 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-12 w-12 rounded-2xl border border-border flex items-center justify-center shrink-0"
            >
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="h-12 flex-1 rounded-2xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
            >
              مرحله بعد
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={creating || classSessions.length === 0}
              className="h-12 flex-1 rounded-2xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {creating ? "در حال ثبت..." : "ساخت کلاس"}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CoachManagementPage() {
  const currentUser = useAtomValue(currentUserAtom);

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classDrawerOpen, setClassDrawerOpen] = useState(false);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentCityFilter, setEnrollmentCityFilter] = useState("all");

  const [capacityInput, setCapacityInput] = useState("");
  const [updatingCapacity, setUpdatingCapacity] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState("");

  const [creatingClass, setCreatingClass] = useState(false);
  const [createClassSheetOpen, setCreateClassSheetOpen] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [savingCoachProfile, setSavingCoachProfile] = useState(false);
  const [coachProfileSheetOpen, setCoachProfileSheetOpen] = useState(false);
  const [coachProfileForm, setCoachProfileForm] = useState({
    coachHeadline: currentUser?.coachHeadline || "",
    coachExperienceYears: currentUser?.coachExperienceYears ? String(currentUser.coachExperienceYears) : "",
    coachHourlyPrice: currentUser?.coachHourlyPrice ? String(currentUser.coachHourlyPrice) : "",
    coachSpecialties: currentUser?.coachSpecialties || "",
    coachCertifications: currentUser?.coachCertifications || "",
    coachLanguages: currentUser?.coachLanguages || "",
  });
  const [privateSessions, setPrivateSessions] = useState([]);
  const [privateSessionsLoading, setPrivateSessionsLoading] = useState(false);
  const [privateSessionsSheetOpen, setPrivateSessionsSheetOpen] = useState(false);
  const [updatingPrivateSessionId, setUpdatingPrivateSessionId] = useState("");
  const [privateSessionStatusFilter, setPrivateSessionStatusFilter] = useState("all");
  const [privateSessionDateFilter, setPrivateSessionDateFilter] = useState("");
  const [coachReviews, setCoachReviews] = useState([]);
  const [coachReviewsStats, setCoachReviewsStats] = useState({ average: 0, total: 0 });
  const [coachReviewsLoading, setCoachReviewsLoading] = useState(false);
  const [reviewsSheetOpen, setReviewsSheetOpen] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySavingId, setReplySavingId] = useState("");

  const isCoach = Boolean(currentUser?.isCoach);

  const selectedClass = useMemo(() => {
    return classes.find((cls) => cls.id === selectedClassId) ?? null;
  }, [classes, selectedClassId]);

  const filteredEnrollments = useMemo(() => {
    const query = enrollmentSearch.trim().toLowerCase();
    return enrollments.filter((item) => {
      const fullName = getUserFullName(item).toLowerCase();
      const byQuery =
        !query ||
        fullName.includes(query) ||
        String(item.phone || "").toLowerCase().includes(query) ||
        String(item.city || "").toLowerCase().includes(query);
      const byCity = enrollmentCityFilter === "all" || (item.city || "نامشخص") === enrollmentCityFilter;
      return byQuery && byCity;
    });
  }, [enrollments, enrollmentSearch, enrollmentCityFilter]);

  const enrollmentCityOptions = useMemo(() => {
    return Array.from(new Set(enrollments.map((item) => item.city || "نامشخص"))).filter(Boolean);
  }, [enrollments]);

  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalParticipants = classes.reduce((sum, item) => sum + Number(item.enrolledCount ?? 0), 0);
    const pendingPrivateSessions = privateSessions.filter((item) => item.status === "pending").length;
    const pendingReplies = coachReviews.filter((item) => !item.coachReply).length;
    return { totalClasses, totalParticipants, pendingPrivateSessions, pendingReplies };
  }, [classes, privateSessions, coachReviews]);

  const filteredPrivateSessions = useMemo(() => {
    return privateSessions.filter((session) => {
      const byStatus = privateSessionStatusFilter === "all" || session.status === privateSessionStatusFilter;
      const byDate = !privateSessionDateFilter || session.date === privateSessionDateFilter;
      return byStatus && byDate;
    });
  }, [privateSessions, privateSessionStatusFilter, privateSessionDateFilter]);

  const loadClasses = async () => {
    if (!currentUser?.id || !isCoach) return;
    setLoading(true);
    const { ok, data } = await coachService.getMyClasses();
    if (!ok) {
      toast.error(data?.message ?? "خطا در دریافت کلاس‌های مربی");
      setLoading(false);
      return;
    }
    const nextClasses = Array.isArray(data?.classes) ? data.classes : [];
    setClasses(nextClasses);
    if (nextClasses.length > 0) {
      setSelectedClassId((prev) => prev || nextClasses[0].id);
    } else {
      setSelectedClassId("");
      setEnrollments([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadClasses(); }, [currentUser?.id, isCoach]);

  useEffect(() => {
    if (!createClassSheetOpen || clubs.length > 0) return;
    setClubsLoading(true);
    apiClient
      .get("/public/clubs")
      .then((res) => setClubs(res.ok ? (res.data?.clubs ?? []) : []))
      .catch(() => setClubs([]))
      .finally(() => setClubsLoading(false));
  }, [createClassSheetOpen, clubs.length]);

  useEffect(() => {
    if (!isCoach) return;
    setCoachProfileForm({
      coachHeadline: currentUser?.coachHeadline || "",
      coachExperienceYears: currentUser?.coachExperienceYears ? String(currentUser.coachExperienceYears) : "",
      coachHourlyPrice: currentUser?.coachHourlyPrice ? String(currentUser.coachHourlyPrice) : "",
      coachSpecialties: currentUser?.coachSpecialties || "",
      coachCertifications: currentUser?.coachCertifications || "",
      coachLanguages: currentUser?.coachLanguages || "",
    });
  }, [currentUser?.coachHeadline, currentUser?.coachExperienceYears, currentUser?.coachHourlyPrice,
    currentUser?.coachSpecialties, currentUser?.coachCertifications, currentUser?.coachLanguages, isCoach]);

  useEffect(() => {
    const loadPrivateSessions = async () => {
      if (!isCoach) return;
      setPrivateSessionsLoading(true);
      const { ok, data } = await coachService.getMyPrivateSessions();
      if (!ok) { setPrivateSessionsLoading(false); return; }
      setPrivateSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      setPrivateSessionsLoading(false);
    };
    loadPrivateSessions();
  }, [isCoach]);

  useEffect(() => {
    const loadCoachReviews = async () => {
      if (!isCoach) return;
      setCoachReviewsLoading(true);
      const { ok, data } = await coachService.getMyCoachReviews();
      if (ok) {
        const rows = Array.isArray(data?.reviews) ? data.reviews : [];
        setCoachReviews(rows);
        setCoachReviewsStats(data?.stats ?? { average: 0, total: 0 });
        setReplyDrafts(rows.reduce((acc, item) => { acc[item.id] = item.coachReply || ""; return acc; }, {}));
      }
      setCoachReviewsLoading(false);
    };
    loadCoachReviews();
  }, [isCoach]);

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!selectedClassId || !classDrawerOpen) { setEnrollments([]); return; }
      setEnrollmentsLoading(true);
      const { ok, data } = await coachService.getClassEnrollments(selectedClassId);
      if (!ok) { toast.error(data?.message ?? "خطا در دریافت لیست ثبت‌نامی‌ها"); setEnrollmentsLoading(false); return; }
      setEnrollments(Array.isArray(data?.enrollments) ? data.enrollments : []);
      setEnrollmentsLoading(false);
    };
    loadEnrollments();
  }, [selectedClassId, classDrawerOpen]);

  useEffect(() => {
    if (!selectedClass) { setCapacityInput(""); return; }
    setCapacityInput(String(selectedClass.capacity ?? ""));
    setEnrollmentSearch("");
    setEnrollmentCityFilter("all");
  }, [selectedClass]);

  const handleCreateClass = async (form, classSessions) => {
    setCreatingClass(true);

    if (classSessions.length === 0) {
      setCreatingClass(false);
      toast.error("حداقل یک جلسه برای کلاس اضافه کنید");
      return;
    }

    if (form.venueMode === "platform" && (!form.clubId || !form.courtId)) {
      setCreatingClass(false);
      toast.error("باشگاه و زمین را انتخاب کنید");
      return;
    }

    if (form.venueMode === "custom" && !form.customLocation.trim()) {
      setCreatingClass(false);
      toast.error("آدرس محل برگزاری را وارد کنید");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      sportType: form.sportType,
      city: form.city,
      level: form.level,
      price: form.price,
      capacity: form.capacity,
      sessions: classSessions,
    };

    const { ok, data } = await coachService.createClass(payload);
    setCreatingClass(false);
    if (!ok) { toast.error(data?.message ?? "خطا در ایجاد کلاس"); return; }

    toast.success("کلاس جدید با موفقیت ساخته شد");
    setCreateClassSheetOpen(false);
    await loadClasses();
  };

  const handleSaveCoachProfile = async (e) => {
    e.preventDefault();
    setSavingCoachProfile(true);
    const { ok, data } = await coachService.updateCoachProfile({
      coachHeadline: coachProfileForm.coachHeadline,
      coachExperienceYears: coachProfileForm.coachExperienceYears,
      coachHourlyPrice: coachProfileForm.coachHourlyPrice,
      coachSpecialties: coachProfileForm.coachSpecialties,
      coachCertifications: coachProfileForm.coachCertifications,
      coachLanguages: coachProfileForm.coachLanguages,
    });
    setSavingCoachProfile(false);
    if (!ok) { toast.error(data?.message ?? "ذخیره اطلاعات مربی انجام نشد"); return; }
    toast.success("پروفایل مربی بروزرسانی شد");
    setCoachProfileSheetOpen(false);
  };

  const handleUpdatePrivateSessionStatus = async (sessionId, status) => {
    setUpdatingPrivateSessionId(sessionId + status);
    const { ok, data } = await coachService.updatePrivateSession(sessionId, { status });
    setUpdatingPrivateSessionId("");
    if (!ok) { toast.error(data?.message ?? "بروزرسانی وضعیت جلسه انجام نشد"); return; }
    setPrivateSessions((prev) => prev.map((item) => (item.id === sessionId ? { ...item, status: data?.session?.status || status } : item)));
    toast.success("وضعیت جلسه خصوصی بروزرسانی شد");
  };

  const handleReplyCoachReview = async (reviewId) => {
    const reply = (replyDrafts[reviewId] || "").trim();
    setReplySavingId(reviewId);
    const { ok, data } = await coachService.replyCoachReview(reviewId, { reply: reply || null });
    setReplySavingId("");
    if (!ok) { toast.error(data?.message ?? "ذخیره پاسخ انجام نشد"); return; }
    setCoachReviews((prev) => prev.map((item) => (
      item.id === reviewId
        ? { ...item, coachReply: data?.review?.coachReply ?? reply, coachRepliedAt: data?.review?.coachRepliedAt ?? (reply ? new Date().toISOString() : null) }
        : item
    )));
    toast.success(reply ? "پاسخ ثبت شد" : "پاسخ حذف شد");
  };

  const openClassDrawer = (classId) => {
    setSelectedClassId(classId);
    setClassDrawerOpen(true);
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedClass || selectedClass.status === status) return;
    setUpdatingStatus(status);
    const { ok, data } = await coachService.updateClass(selectedClass.id, { status });
    setUpdatingStatus("");
    if (!ok) { toast.error(data?.message ?? "ویرایش وضعیت کلاس انجام نشد"); return; }
    toast.success("وضعیت کلاس بروزرسانی شد");
    await loadClasses();
  };

  const handleUpdateCapacity = async () => {
    if (!selectedClass || !capacityInput.trim()) { toast.error("ظرفیت را وارد کنید"); return; }
    const parsed = Number.parseInt(capacityInput, 10);
    if (!Number.isFinite(parsed) || parsed < 1) { toast.error("ظرفیت نامعتبر است"); return; }
    if (parsed === Number(selectedClass.capacity)) { toast("ظرفیت تغییری نکرد"); return; }
    setUpdatingCapacity(true);
    const { ok, data } = await coachService.updateClass(selectedClass.id, { capacity: parsed });
    setUpdatingCapacity(false);
    if (!ok) { toast.error(data?.message ?? "ویرایش ظرفیت کلاس انجام نشد"); return; }
    toast.success("ظرفیت کلاس بروزرسانی شد");
    await loadClasses();
  };

  if (!isCoach) {
    return (
      <div className="px-4 py-8" dir="rtl">
        <div className="rounded-3xl border border-border bg-card p-6 text-center space-y-2">
          <p className="text-base font-black text-foreground">پنل مدیریت مربی</p>
          <p className="text-sm text-muted-foreground">این بخش فقط برای حساب‌های مربی فعال است.</p>
          <Link to="/coaches" className="inline-flex items-center gap-1 text-primary text-sm font-bold">
            بازگشت به لیست مربی‌ها
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 sm:px-4 space-y-5 pb-8" dir="rtl">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div>
          <p className="text-[11px] font-bold text-primary/70 tracking-wide">COACH STUDIO</p>
          <h1 className="text-xl font-black text-foreground mt-0.5">پنل مربی</h1>
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1 justify-end">
            <p className="text-xs font-bold text-foreground">{getUserFullName(currentUser)}</p>
            {currentUser?.coachVerificationStatus === "true" && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                <BadgeCheckIcon className="w-3 h-3" />
                تأیید شده
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {currentUser?.coachVerificationStatus === "none" ? "در انتظار تأیید" : "مربی فعال"}
          </span>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "کلاس‌ها", value: stats.totalClasses, icon: DumbbellIcon, color: "text-primary" },
          { label: "ثبت‌نام", value: stats.totalParticipants, icon: UsersIcon, color: "text-sky-600" },
          { label: "جلسه خصوصی", value: stats.pendingPrivateSessions, icon: CalendarDaysIcon, color: "text-amber-600", badge: stats.pendingPrivateSessions > 0 },
          { label: "نظرات", value: stats.pendingReplies, icon: MessageSquareIcon, color: "text-rose-600", badge: stats.pendingReplies > 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-2.5 text-center space-y-1 relative">
            {stat.badge && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
            )}
            <stat.icon className={cn("w-4 h-4 mx-auto", stat.color)} />
            <p className="text-lg font-black text-foreground leading-none">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="space-y-2">
        <p className="text-xs font-black text-muted-foreground">اقدامات سریع</p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (currentUser?.coachVerificationStatus === "none") {
                toast.error("ابتدا با ما تماس بگیرید تا اکانت مربی شما فعال شود");
                return;
              }
              setCreateClassSheetOpen(true);
            }}
            className="rounded-2xl border border-primary/30 bg-primary/8 px-4 py-4 text-right space-y-1.5 transition hover:bg-primary/12 active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <PlusIcon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-black text-primary">افزودن کلاس</p>
            <p className="text-[11px] text-muted-foreground">کلاس گروهی جدید بساز</p>
          </button>

          <button
            type="button"
            onClick={() => setCoachProfileSheetOpen(true)}
            className="rounded-2xl border border-border bg-card px-4 py-4 text-right space-y-1.5 transition hover:border-border/80 active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
              <UserRoundPenIcon className="w-4 h-4 text-foreground" />
            </div>
            <p className="text-sm font-black text-foreground">پروفایل مربی</p>
            <p className="text-[11px] text-muted-foreground">اطلاعات حرفه‌ای</p>
          </button>

          <button
            type="button"
            onClick={() => setPrivateSessionsSheetOpen(true)}
            className="rounded-2xl border border-border bg-card px-4 py-4 text-right space-y-1.5 transition hover:border-border/80 active:scale-[0.98] relative"
          >
            {stats.pendingPrivateSessions > 0 && (
              <span className="absolute top-3 left-3 text-[10px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                {stats.pendingPrivateSessions}
              </span>
            )}
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
              <CalendarDaysIcon className="w-4 h-4 text-foreground" />
            </div>
            <p className="text-sm font-black text-foreground">جلسات خصوصی</p>
            <p className="text-[11px] text-muted-foreground">مدیریت درخواست‌ها</p>
          </button>

          <button
            type="button"
            onClick={() => setReviewsSheetOpen(true)}
            className="rounded-2xl border border-border bg-card px-4 py-4 text-right space-y-1.5 transition hover:border-border/80 active:scale-[0.98] relative"
          >
            {stats.pendingReplies > 0 && (
              <span className="absolute top-3 left-3 text-[10px] font-black text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded-full">
                {stats.pendingReplies}
              </span>
            )}
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
              <MessageSquareIcon className="w-4 h-4 text-foreground" />
            </div>
            <p className="text-sm font-black text-foreground">نظرات</p>
            <p className="text-[11px] text-muted-foreground">پاسخ به کاربران</p>
          </button>
        </div>
      </div>

      {/* ── Classes List ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-foreground">کلاس‌های من</p>
          <Link to="/coaches" className="text-xs text-primary font-bold">پروفایل عمومی</Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-2">
            <DumbbellIcon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">هنوز کلاسی نساختی</p>
            <button
              type="button"
              onClick={() => setCreateClassSheetOpen(true)}
              className="text-xs text-primary font-bold"
            >
              اولین کلاست رو بساز ←
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => {
              const meta = CLASS_STATUS_META[cls.status] ?? CLASS_STATUS_META.active;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => openClassDrawer(cls.id)}
                  className="w-full text-right rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:border-primary/30 hover:bg-primary/3 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-foreground truncate">{cls.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{cls.city || "نامشخص"} · {cls.sportType}</p>
                      {getClassVenue(cls) && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{getClassVenue(cls)}</p>
                      )}
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full font-bold shrink-0", meta.className)}>{meta.label}</span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="w-3 h-3" />
                      {cls.enrolledCount ?? 0}/{cls.capacity}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDaysIcon className="w-3 h-3" />
                      {Array.isArray(cls.sessions) ? cls.sessions.length : 0} جلسه
                    </span>
                    <span className="mr-auto font-bold text-primary">{Number(cls.price || 0).toLocaleString("fa-IR")} ت</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Class Detail Drawer ── */}
      <BottomSheet
        open={classDrawerOpen}
        onDismiss={() => setClassDrawerOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.9, 780)]}
      >
        <div className="bg-background text-foreground min-h-[62vh] px-4 pt-4 pb-6" dir="rtl">
          <button
            type="button"
            onClick={() => setClassDrawerOpen(false)}
            className="mb-3 flex items-center gap-2 text-xs text-muted-foreground font-bold"
          >
            <XIcon className="w-4 h-4" />
            بستن
          </button>

          {!selectedClass ? (
            <p className="text-sm text-muted-foreground">کلاسی انتخاب نشده است.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-black text-foreground">{selectedClass.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedClass.city || "نامشخص"} · {selectedClass.sportType}</p>
                  {getClassVenue(selectedClass) && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{getClassVenue(selectedClass)}</p>
                  )}
                </div>
                <span className={cn("text-[10px] px-2 py-1 rounded-full font-bold shrink-0", (CLASS_STATUS_META[selectedClass.status] ?? CLASS_STATUS_META.active).className)}>
                  {(CLASS_STATUS_META[selectedClass.status] ?? CLASS_STATUS_META.active).label}
                </span>
              </div>

              {selectedClass.description && (
                <p className="text-xs text-muted-foreground leading-6 bg-muted/40 rounded-xl px-3 py-2">{selectedClass.description}</p>
              )}

              {/* Status actions */}
              <div className="space-y-2">
                <p className="text-xs font-black text-muted-foreground">تغییر وضعیت</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("completed")}
                    disabled={updatingStatus === "completed" || selectedClass.status === "completed"}
                    className="h-10 rounded-xl bg-sky-600 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <CheckCircle2Icon className="w-3.5 h-3.5" />
                    {updatingStatus === "completed" ? "..." : "تکمیل کلاس"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("cancelled")}
                    disabled={updatingStatus === "cancelled" || selectedClass.status === "cancelled"}
                    className="h-10 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <XCircleIcon className="w-3.5 h-3.5" />
                    {updatingStatus === "cancelled" ? "..." : "لغو کلاس"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("active")}
                    disabled={updatingStatus === "active" || selectedClass.status === "active"}
                    className="col-span-2 h-10 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-bold disabled:opacity-50"
                  >
                    {updatingStatus === "active" ? "..." : "بازگشت به فعال"}
                  </button>
                </div>
              </div>

              {/* Capacity */}
              <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-foreground">مدیریت ظرفیت</p>
                  <span className="text-[11px] text-muted-foreground">{selectedClass.enrolledCount ?? 0} ثبت‌نام فعال</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
                    placeholder="ظرفیت جدید"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateCapacity}
                    disabled={updatingCapacity}
                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-black disabled:opacity-50"
                  >
                    {updatingCapacity ? "..." : "ثبت"}
                  </button>
                </div>
              </div>

              {/* Sessions */}
              {Array.isArray(selectedClass.sessions) && selectedClass.sessions.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-foreground">جلسات کلاس</p>
                    <span className="text-[11px] text-primary font-bold">{selectedClass.sessions.length} جلسه</span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedClass.sessions.map((s, idx) => (
                      <div key={`${s.date}-${s.startTime}-${idx}`} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" />{s.date}</span>
                        <span className="flex items-center gap-1"><Clock3Icon className="w-3 h-3" />{s.startTime}–{s.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enrollments */}
              <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
                <p className="text-xs font-black text-foreground">شرکت‌کننده‌ها</p>
                <div className="space-y-2">
                  <input
                    value={enrollmentSearch}
                    onChange={(e) => setEnrollmentSearch(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    placeholder="جستجو: اسم، شماره، شهر"
                  />
                  <select
                    value={enrollmentCityFilter}
                    onChange={(e) => setEnrollmentCityFilter(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="all">همه شهرها</option>
                    {enrollmentCityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {enrollmentsLoading ? (
                  <div className="h-20 rounded-xl bg-muted animate-pulse" />
                ) : filteredEnrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">شرکت‌کننده‌ای پیدا نشد.</p>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {filteredEnrollments.map((item) => {
                      const fullName = getUserFullName(item);
                      const imageSrc = getProfileImage(item.image);
                      return (
                        <div key={item.id} className="rounded-xl border border-border bg-background px-3 py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-muted overflow-hidden shrink-0">
                              {imageSrc ? (
                                <img src={imageSrc} alt={fullName} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs font-black text-muted-foreground">{fullName?.[0] ?? "U"}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{fullName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{item.phone || item.city || "—"}</p>
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">{new Date(item.createdAt).toLocaleDateString("fa-IR")}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* ── Create Class Sheet ── */}
      <CreateClassSheet
        open={createClassSheetOpen}
        onClose={() => setCreateClassSheetOpen(false)}
        clubs={clubs}
        clubsLoading={clubsLoading}
        onSubmit={handleCreateClass}
        creating={creatingClass}
      />

      {/* ── Coach Profile Sheet ── */}
      <BottomSheet
        open={coachProfileSheetOpen}
        onDismiss={() => setCoachProfileSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.88, 760)]}
      >
        <div className="bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          <form onSubmit={handleSaveCoachProfile} className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <UserRoundPenIcon className="w-4 h-4 text-primary" />
                <p className="text-sm font-black text-foreground">پروفایل حرفه‌ای</p>
              </div>
              <button type="button" onClick={() => setCoachProfileSheetOpen(false)} className="w-8 h-8 rounded-xl border border-border flex items-center justify-center">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">تیتر معرفی</p>
              <input
                value={coachProfileForm.coachHeadline}
                onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachHeadline: e.target.value }))}
                placeholder="مثلاً: مربی پدل با ۵ سال تجربه"
                className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground">سال تجربه</p>
                <input
                  value={coachProfileForm.coachExperienceYears}
                  onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachExperienceYears: e.target.value }))}
                  placeholder="مثلاً: ۵"
                  className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground">قیمت هر جلسه</p>
                <input
                  value={coachProfileForm.coachHourlyPrice}
                  onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachHourlyPrice: e.target.value }))}
                  placeholder="تومان"
                  className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">تخصص‌ها</p>
              <textarea rows={2} value={coachProfileForm.coachSpecialties}
                onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachSpecialties: e.target.value }))}
                placeholder="مثلاً: پدل، تنیس، تناسب اندام"
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">مدارک و گواهی‌ها</p>
              <textarea rows={2} value={coachProfileForm.coachCertifications}
                onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachCertifications: e.target.value }))}
                placeholder="مدارک حرفه‌ای خود را وارد کنید"
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">زبان‌ها</p>
              <input
                value={coachProfileForm.coachLanguages}
                onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachLanguages: e.target.value }))}
                placeholder="مثلاً: فارسی، انگلیسی"
                className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={savingCoachProfile}
              className="h-12 w-full rounded-2xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-50"
            >
              {savingCoachProfile ? "در حال ذخیره..." : "ذخیره پروفایل"}
            </button>
          </form>
        </div>
      </BottomSheet>

      {/* ── Private Sessions Sheet ── */}
      <BottomSheet
        open={privateSessionsSheetOpen}
        onDismiss={() => setPrivateSessionsSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.9, 760)]}
      >
        <div className="bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-foreground">جلسات خصوصی</p>
              <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">{stats.pendingPrivateSessions} در انتظار</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={privateSessionStatusFilter}
                onChange={(e) => setPrivateSessionStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 text-xs"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending">در انتظار</option>
                <option value="confirmed">تایید شده</option>
                <option value="completed">انجام شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
              <select
                value={privateSessionDateFilter}
                onChange={(e) => setPrivateSessionDateFilter(e.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 text-xs"
              >
                <option value="">همه تاریخ‌ها</option>
                {DATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {privateSessionsLoading ? (
              <div className="h-20 rounded-xl bg-muted animate-pulse" />
            ) : filteredPrivateSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">جلسه‌ای با فیلترهای فعلی پیدا نشد.</p>
            ) : (
              <div className="space-y-2 max-h-[58vh] overflow-y-auto">
                {filteredPrivateSessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">{getUserFullName(session.user)}</p>
                      {session.status === "confirmed" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">تایید شده</span>}
                      {session.status === "cancelled" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">لغو شده</span>}
                      {session.status === "pending" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">در انتظار</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>{formatPersianDateInTehran(session.date, { weekday: "short", month: "long", day: "numeric" })}</span>
                      <span>·</span>
                      <span>{session.startTime}–{session.endTime}</span>
                      {session.location && <><span>·</span><span>{session.location}</span></>}
                    </div>
                    {session.notes && <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">{session.notes}</p>}
                    <p className="text-[11px] text-muted-foreground">{session.user?.phone || "بدون شماره"}</p>
                    {session.status === "pending" && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button type="button" onClick={() => handleUpdatePrivateSessionStatus(session.id, "confirmed")}
                          disabled={updatingPrivateSessionId === session.id + "confirmed"}
                          className="h-9 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">
                          {updatingPrivateSessionId === session.id + "confirmed" ? "..." : "تایید"}
                        </button>
                        <button type="button" onClick={() => handleUpdatePrivateSessionStatus(session.id, "cancelled")}
                          disabled={updatingPrivateSessionId === session.id + "cancelled"}
                          className="h-9 rounded-xl bg-rose-600 text-white text-xs font-black disabled:opacity-50">
                          {updatingPrivateSessionId === session.id + "cancelled" ? "..." : "لغو"}
                        </button>
                      </div>
                    )}
                    {session.status === "confirmed" && (
                      <button type="button" onClick={() => handleUpdatePrivateSessionStatus(session.id, "cancelled")}
                        disabled={updatingPrivateSessionId === session.id + "cancelled"}
                        className="h-9 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black disabled:opacity-50">
                        {updatingPrivateSessionId === session.id + "cancelled" ? "..." : "لغو جلسه"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* ── Reviews Sheet ── */}
      <BottomSheet
        open={reviewsSheetOpen}
        onDismiss={() => setReviewsSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.9, 760)]}
      >
        <div className="bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-foreground">نظرات کاربران</p>
              <div className="flex items-center gap-1">
                <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-black text-foreground">{coachReviewsStats.average || "0.0"}</span>
                <span className="text-xs text-muted-foreground">({coachReviewsStats.total || 0})</span>
              </div>
            </div>

            {coachReviewsLoading ? (
              <div className="h-20 rounded-xl bg-muted animate-pulse" />
            ) : coachReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز نظری ثبت نشده.</p>
            ) : (
              <div className="space-y-2 max-h-[58vh] overflow-y-auto">
                {coachReviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{getUserFullName(review.user)}</p>
                        <p className="text-[11px] text-muted-foreground">{review.user?.phone || "بدون شماره"}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <StarIcon key={`${review.id}-${idx}`} className={cn("w-3.5 h-3.5", idx < Number(review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-xs text-muted-foreground leading-5">{review.comment}</p>}
                    <textarea
                      rows={2}
                      value={replyDrafts[review.id] || ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                      placeholder="پاسخ شما به این نظر..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleReplyCoachReview(review.id)}
                      disabled={replySavingId === review.id}
                      className="h-9 w-full rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <SendIcon className="w-3.5 h-3.5" />
                      {replySavingId === review.id ? "در حال ذخیره..." : "ذخیره پاسخ"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
