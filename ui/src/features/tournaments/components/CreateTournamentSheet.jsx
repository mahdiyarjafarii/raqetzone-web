import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSetAtom } from "jotai";
import toast from "react-hot-toast";
import {
  XIcon, ChevronRightIcon, ChevronLeftIcon,
  GiftIcon, CoinsIcon, UsersIcon, ShieldCheckIcon,
  CalendarIcon, CheckIcon, TrophyIcon, ZapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createTournamentOpenAtom, tournamentsAtom } from "../store/tournamentStore";
import { tournamentService } from "../services/tournamentService";

const SPORTS = [
  { value: "padel",     label: "پدل",      icon: "🏓" },
  { value: "tennis",    label: "تنیس",      icon: "🎾" },
  { value: "squash",    label: "اسکواش",    icon: "🟡" },
  { value: "badminton", label: "بدمینتون",  icon: "🏸" },
  { value: "ping-pong", label: "پینگ‌پنگ",  icon: "🏓" },
];

const STEPS = [
  { label: "اطلاعات پایه", icon: <TrophyIcon className="w-3.5 h-3.5" /> },
  { label: "زمان‌بندی",    icon: <CalendarIcon className="w-3.5 h-3.5" /> },
  { label: "شرایط و جوایز", icon: <GiftIcon className="w-3.5 h-3.5" /> },
];

const defaultForm = {
  title: "",
  description: "",
  sportType: "padel",
  entryFee: 0,
  isFree: true,
  maxParticipants: 16,
  registrationDeadline: "",
  startDate: "",
  endDate: "",
  minLevel: 1,
  prize: "",
  rules: "",
};

const inputClass =
  "w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors";

const dateTimeFormatFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "short",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function toLocalDateTimeValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDatePart(value) {
  return value?.split("T")[0] ?? "";
}

function getTimePart(value) {
  return value?.split("T")[1] ?? "12:00";
}

function buildDateOptions(daysAhead = 730) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: daysAhead }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      value: toLocalDateTimeValue(date).split("T")[0],
      label: dateTimeFormatFa.format(date),
    };
  });
}

const persianDateOptions = buildDateOptions();
const persianNumberFormat = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 });
const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function PersianTimeInput({ value, onChange }) {
  const [hour = "12", minute = "00"] = (value || "12:00").split(":");

  function emit(nextHour, nextMinute) {
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <div className="grid grid-cols-2 gap-1 w-32">
      <select
        dir="rtl"
        value={hour}
        onChange={(e) => emit(e.target.value, minute)}
        className={cn(inputClass, "text-center px-2")}
      >
        {hourOptions.map((option) => (
          <option key={option} value={option}>{persianNumberFormat.format(Number(option))}</option>
        ))}
      </select>
      <select
        dir="rtl"
        value={minute}
        onChange={(e) => emit(hour, e.target.value)}
        className={cn(inputClass, "text-center px-2")}
      >
        {minuteOptions.map((option) => (
          <option key={option} value={option}>{persianNumberFormat.format(Number(option))}</option>
        ))}
      </select>
    </div>
  );
}

function PersianDateTimeInput({ value, onChange }) {
  const datePart = getDatePart(value);
  const timePart = getTimePart(value);

  function emit(nextDate, nextTime) {
    if (!nextDate) return;
    onChange(`${nextDate}T${nextTime}`);
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <select
        dir="rtl"
        value={datePart}
        onChange={(e) => emit(e.target.value, timePart)}
        className={inputClass}
      >
        <option value="">انتخاب تاریخ...</option>
        {persianDateOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <PersianTimeInput
        value={timePart}
        onChange={(nextTime) => emit(datePart, nextTime)}
      />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-bold text-foreground/70 uppercase tracking-wide">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Step 1: Basic Info ─────────────────────────────────────────────────────

function Step1({ form, setForm }) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <Field label="عنوان تورنومنت *">
        <input
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="مثال: مسابقات پدل بهاره"
          className={inputClass}
          autoFocus
        />
      </Field>

      <Field label="توضیحات">
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="توضیح مختصری از تورنومنت..."
          rows={3}
          className={cn(inputClass, "resize-none")}
        />
      </Field>

      <Field label="نوع ورزش *">
        <div className="grid grid-cols-5 gap-2">
          {SPORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setForm((p) => ({ ...p, sportType: s.value }))}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-center transition-all",
                form.sportType === s.value
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-border bg-muted/50 hover:border-violet-500/40"
              )}
            >
              <span className="text-2xl leading-none">{s.icon}</span>
              <span className={cn(
                "text-[9px] font-bold",
                form.sportType === s.value ? "text-violet-500" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </Field>
    </motion.div>
  );
}

// ─── Step 2: Schedule ───────────────────────────────────────────────────────

function Step2({ form, setForm }) {
  const deadline = form.registrationDeadline ? new Date(form.registrationDeadline) : null;
  const start = form.startDate ? new Date(form.startDate) : null;
  const end = form.endDate ? new Date(form.endDate) : null;

  const allSet = deadline && start && end;
  const validOrder = allSet && deadline < start && start < end;

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <Field label="مهلت ثبت‌نام *" hint="قبل از شروع مسابقه">
        <PersianDateTimeInput
          value={form.registrationDeadline}
          onChange={(value) => setForm((p) => ({ ...p, registrationDeadline: value }))}
        />
      </Field>

      <Field label="تاریخ شروع *">
        <PersianDateTimeInput
          value={form.startDate}
          onChange={(value) => setForm((p) => ({ ...p, startDate: value }))}
        />
      </Field>

      <Field label="تاریخ پایان *">
        <PersianDateTimeInput
          value={form.endDate}
          onChange={(value) => setForm((p) => ({ ...p, endDate: value }))}
        />
      </Field>

      {/* Visual timeline */}
      {allSet && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl p-4 border space-y-3",
            validOrder
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          )}
        >
          <p className={cn(
            "text-xs font-bold flex items-center gap-1.5",
            validOrder ? "text-emerald-600" : "text-red-500"
          )}>
            {validOrder ? (
              <><CheckIcon className="w-3.5 h-3.5" /> ترتیب تاریخ‌ها صحیح است</>
            ) : (
              <>⚠️ ترتیب تاریخ‌ها اشتباه است</>
            )}
          </p>
          <div className="flex items-center gap-1 text-[11px]">
            <TimelineNode color="emerald" label="ثبت‌نام" date={deadline} />
            <div className="flex-1 h-0.5 bg-border rounded" />
            <TimelineNode color="blue" label="شروع" date={start} />
            <div className="flex-1 h-0.5 bg-border rounded" />
            <TimelineNode color="violet" label="پایان" date={end} />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function TimelineNode({ color, label, date }) {
  const colors = {
    emerald: "bg-emerald-500 text-emerald-600",
    blue: "bg-blue-500 text-blue-600",
    violet: "bg-violet-500 text-violet-600",
  };
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className={cn("w-2 h-2 rounded-full", `bg-${color}-500`)} />
      <span className={cn("font-bold text-[9px]", `text-${color}-600`)}>{label}</span>
      <span className="text-[9px] text-muted-foreground tabular-nums">
        {date?.toLocaleDateString("fa-IR", { month: "short", day: "numeric" })}
      </span>
    </div>
  );
}

// ─── Step 3: Conditions & Prizes ────────────────────────────────────────────

function Step3({ form, setForm }) {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <Field label="نوع ورودیه">
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: true,  label: "🎁 رایگان", activeClass: "bg-emerald-600 border-emerald-600 text-white" },
            { v: false, label: "💰 پولی",   activeClass: "bg-violet-600  border-violet-600  text-white" },
          ].map(({ v, label, activeClass }) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setForm((p) => ({ ...p, isFree: v }))}
              className={cn(
                "py-3 rounded-2xl text-sm font-bold border-2 transition-all",
                form.isFree === v ? activeClass : "bg-muted border-border text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <AnimatePresence>
        {!form.isFree && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Field label="مبلغ ورودیه (تومان) *">
              <div className="relative">
                <CoinsIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 pointer-events-none" />
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={form.entryFee}
                  onChange={(e) => setForm((p) => ({ ...p, entryFee: Number(e.target.value) }))}
                  className={cn(inputClass, "pr-9")}
                  placeholder="۵۰۰۰۰"
                />
              </div>
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <Field label="ظرفیت" hint={`${form.maxParticipants} نفر`}>
          <input
            type="range"
            min={4}
            max={128}
            step={4}
            value={form.maxParticipants}
            onChange={(e) => setForm((p) => ({ ...p, maxParticipants: Number(e.target.value) }))}
            className="w-full accent-violet-600"
          />
        </Field>
        <Field label="حداقل سطح" hint={`سطح ${form.minLevel}`}>
          <input
            type="range"
            min={1}
            max={10}
            value={form.minLevel}
            onChange={(e) => setForm((p) => ({ ...p, minLevel: Number(e.target.value) }))}
            className="w-full accent-amber-500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <UsersIcon className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="text-violet-600 font-bold">{form.maxParticipants} نفر</span>
        </div>
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <ZapIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-600 font-bold">سطح {form.minLevel}+</span>
        </div>
      </div>

      <Field label="جوایز مسابقه">
        <div className="relative">
          <GiftIcon className="absolute right-3 top-3 w-4 h-4 text-amber-500 pointer-events-none" />
          <textarea
            value={form.prize}
            onChange={(e) => setForm((p) => ({ ...p, prize: e.target.value }))}
            placeholder={"🥇 اول: ...\n🥈 دوم: ...\n🥉 سوم: ..."}
            rows={3}
            className={cn(inputClass, "resize-none pr-9")}
          />
        </div>
      </Field>

      <Field label="قوانین و مقررات">
        <div className="relative">
          <ShieldCheckIcon className="absolute right-3 top-3 w-4 h-4 text-blue-500 pointer-events-none" />
          <textarea
            value={form.rules}
            onChange={(e) => setForm((p) => ({ ...p, rules: e.target.value }))}
            placeholder="قوانین مسابقه، نحوه امتیازدهی و..."
            rows={3}
            className={cn(inputClass, "resize-none pr-9")}
          />
        </div>
      </Field>
    </motion.div>
  );
}

// ─── Progress Stepper ────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 px-2">
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                done   ? "bg-emerald-500 border-emerald-500 text-white" :
                active ? "bg-violet-600  border-violet-600  text-white shadow-lg shadow-violet-500/30" :
                         "bg-muted       border-border       text-muted-foreground"
              )}>
                {done ? <CheckIcon className="w-4 h-4" /> : step.icon}
              </div>
              <span className={cn(
                "text-[9px] font-bold whitespace-nowrap",
                active ? "text-violet-600" : done ? "text-emerald-500" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all duration-500",
                i < current ? "bg-emerald-500" : "bg-border"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Sheet ──────────────────────────────────────────────────────────────

export default function CreateTournamentSheet({ onCreated }) {
  const setOpen = useSetAtom(createTournamentOpenAtom);
  const setTournaments = useSetAtom(tournamentsAtom);
  const [form, setForm] = useState(defaultForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  function validateStep() {
    if (step === 0) {
      if (!form.title.trim()) { toast.error("عنوان تورنومنت الزامی است"); return false; }
    }
    if (step === 1) {
      if (!form.registrationDeadline) { toast.error("مهلت ثبت‌نام الزامی است"); return false; }
      if (!form.startDate) { toast.error("تاریخ شروع الزامی است"); return false; }
      if (!form.endDate) { toast.error("تاریخ پایان الزامی است"); return false; }
      if (new Date(form.registrationDeadline) >= new Date(form.startDate)) {
        toast.error("مهلت ثبت‌نام باید قبل از شروع مسابقه باشد");
        return false;
      }
      if (new Date(form.startDate) >= new Date(form.endDate)) {
        toast.error("تاریخ شروع باید قبل از پایان باشد");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await tournamentService.createTournament({
        ...form,
        entryFee: form.isFree ? 0 : Number(form.entryFee),
        maxParticipants: Number(form.maxParticipants),
        minLevel: Number(form.minLevel),
      });

      if (res.ok) {
        toast.success("تورنومنت با موفقیت ایجاد شد 🏆");
        setForm(defaultForm);
        setStep(0);
        setOpen(false);
        onCreated?.(res.data.tournament);
      } else {
        toast.error(res.data?.message ?? "خطا در ایجاد تورنومنت");
      }
    } finally {
      setLoading(false);
    }
  }

  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
      />

      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* Drag pill */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="font-black text-lg">ایجاد تورنومنت</h2>
            <p className="text-xs text-muted-foreground">مرحله {step + 1} از {STEPS.length}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <XIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted shrink-0">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Step indicator */}
        <div className="px-5 py-4 shrink-0">
          <StepIndicator current={step} />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <AnimatePresence mode="wait">
            {step === 0 && <Step1 key="s1" form={form} setForm={setForm} />}
            {step === 1 && <Step2 key="s2" form={form} setForm={setForm} />}
            {step === 2 && <Step3 key="s3" form={form} setForm={setForm} />}
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="shrink-0 px-5 pb-8 pt-3 border-t border-border bg-background">
          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
                قبلی
              </button>
            )}

            <button
              type="button"
              onClick={isLast ? handleSubmit : nextStep}
              disabled={loading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all disabled:opacity-60",
                isLast
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/30"
                  : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/20"
              )}
            >
              {loading ? "در حال ایجاد..." : isLast ? (
                <><TrophyIcon className="w-4 h-4" /> ایجاد تورنومنت</>
              ) : (
                <>بعدی <ChevronLeftIcon className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
