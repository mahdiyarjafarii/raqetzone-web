import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { ChevronRightIcon, CheckIcon, BuildingIcon, MapPinIcon, ShieldCheckIcon, CalendarIcon, ClockIcon, XIcon } from "lucide-react";

import { createMatchOpenAtom, matchesAtom } from "@/store/matchStore";
import { matchService } from "@/services/matchService";
import { cn } from "@/lib/utils";
import {
  addDaysToDateKey,
  formatPersianDateInTehran,
  getTodayDateKeyInTehran,
} from "@/lib/timezone";
import apiClient from "@/lib/apiClient";

const SPORTS = [
  { value: "padel", label: "پدل", icon: "🥎" },
  { value: "tennis", label: "تنیس", icon: "🎾" },
  { value: "squash", label: "اسکواش", icon: "🟡" },
  { value: "badminton", label: "بدمینتون", icon: "🏸" },
  { value: "ping-pong", label: "پینگ‌پنگ", icon: "🏓" },
];

const defaultForm = {
  title: "",
  sportType: "padel",
  venueMode: "platform", // "platform" = باشگاه‌های ما | "custom" = زمین غیر پلتفرم
  clubId: "",
  courtId: "",
  customLocation: "",
  customCourtName: "",
  scheduledAt: "",
  teamSize: 2,
  isCertified: false,
};

const STEPS = ["ورزش و نام", "باشگاه و زمین", "زمان و تیم"];

function getDatePart(value) {
  return value?.split("T")[0] ?? "";
}

function getTimePart(value) {
  return value?.split("T")[1] ?? "12:00";
}

function isSlotUnavailable(slot) {
  return slot.isBooked || slot.isPending || slot.isBlocked || slot.isManualBooked;
}

function buildDateOptions(daysAhead = 730) {
  const today = getTodayDateKeyInTehran();
  return Array.from({ length: daysAhead }, (_, index) => {
    const dateKey = addDaysToDateKey(today, index);
    return {
      value: dateKey,
      label: formatPersianDateInTehran(dateKey, {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  });
}

const persianDateOptions = buildDateOptions();
const persianNumberFormat = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 });
const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function PersianDateTimeInput({ value, onChange, className }) {
  const [open, setOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState("date");
  const datePart = getDatePart(value);
  const timePart = getTimePart(value);
  const selectedDateLabel = persianDateOptions.find((option) => option.value === datePart)?.label;
  const [hour = "12", minute = "00"] = timePart.split(":");

  function emit(nextDate, nextTime) {
    if (!nextDate) return;
    onChange(`${nextDate}T${nextTime}`);
  }

  function handleDateSelect(nextDate) {
    emit(nextDate, timePart);
    setPickerStep("time");
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setPickerStep(datePart ? "time" : "date");
          setOpen(true);
        }}
        className={cn(
          "w-full rounded-3xl border-2 bg-muted/60 px-4 py-4 text-right transition-all active:scale-[0.99]",
          datePart ? "border-primary/40 shadow-lg shadow-primary/10" : "border-border"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">تاریخ و ساعت بازی</p>
            <p className={cn("text-sm font-black truncate", datePart ? "text-foreground" : "text-muted-foreground")}>
              {datePart ? `${selectedDateLabel}، ساعت ${persianNumberFormat.format(Number(hour))}:${persianNumberFormat.format(Number(minute))}` : "انتخاب تاریخ و ساعت"}
            </p>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-muted-foreground rotate-180" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-[2rem] bg-background border-t border-border shadow-2xl max-h-[82vh] overflow-hidden flex flex-col"
            >
              <div className="px-5 pt-3 pb-5 overflow-y-auto">
                <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-right">
                    <h3 className="font-black text-lg">انتخاب زمان بازی</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pickerStep === "date" ? "اول تاریخ بازی را انتخاب کن" : "حالا ساعت شروع بازی را مشخص کن"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 rounded-2xl bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => setPickerStep("date")}
                    className={cn("py-2.5 rounded-xl text-xs font-bold transition-all", pickerStep === "date" ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
                  >
                    ۱. تاریخ
                  </button>
                  <button
                    type="button"
                    disabled={!datePart}
                    onClick={() => setPickerStep("time")}
                    className={cn("py-2.5 rounded-xl text-xs font-bold transition-all", pickerStep === "time" ? "bg-background text-primary shadow-sm" : "text-muted-foreground", !datePart && "opacity-40")}
                  >
                    ۲. ساعت
                  </button>
                </div>

                {pickerStep === "date" ? (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {persianDateOptions.slice(0, 45).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleDateSelect(option.value)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-right transition-all",
                          datePart === option.value ? "border-primary bg-primary/10" : "border-border bg-muted/30"
                        )}
                      >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", datePart === option.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          {datePart === option.value ? <CheckIcon className="w-4 h-4" /> : <CalendarIcon className="w-4 h-4" />}
                        </div>
                        <span className="font-bold text-sm text-foreground">{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">تاریخ انتخاب‌شده</p>
                      <p className="font-black text-sm text-foreground">{selectedDateLabel}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <ClockIcon className="w-3.5 h-3.5" />
                          ساعت
                        </div>
                        <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                          {hourOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => emit(datePart, `${option}:${minute}`)}
                              className={cn("py-3 rounded-2xl text-sm font-black border-2 transition-all", hour === option ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-muted/40 border-border text-foreground")}
                            >
                              {persianNumberFormat.format(Number(option))}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <ClockIcon className="w-3.5 h-3.5" />
                          دقیقه
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                          {minuteOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => emit(datePart, `${hour}:${option}`)}
                              className={cn("py-3 rounded-2xl text-sm font-black border-2 transition-all", minute === option ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-muted/40 border-border text-foreground")}
                            >
                              {persianNumberFormat.format(Number(option))}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
                    >
                      تایید زمان بازی
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CreateMatchSheet() {
  const [open, setOpen] = useAtom(createMatchOpenAtom);
  const setMatches = useSetAtom(matchesAtom);
  const [form, setForm] = useState(defaultForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    if (open && clubs.length === 0) {
      setClubsLoading(true);
      apiClient.get("/public/clubs")
        .then((res) => setClubs(res.ok ? (res.data?.clubs ?? []) : []))
        .catch(() => setClubs([]))
        .finally(() => setClubsLoading(false));
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => { setForm(defaultForm); setStep(0); }, 300);
    }
  }, [open]);

  const selectedClub = clubs.find((c) => c.id === form.clubId);
  const availableCourts = selectedClub?.courts?.filter((c) => c.isActive !== false) ?? [];
  const selectedCourt = availableCourts.find((c) => c.id === form.courtId);

  const isCustomVenue = form.venueMode === "custom";
  const selectedDateKey = getDatePart(form.scheduledAt);
  const selectedTimeKey = getTimePart(form.scheduledAt);

  useEffect(() => {
    if (!open || isCustomVenue || !selectedCourt || !selectedDateKey) {
      setAvailability(null);
      setAvailabilityLoading(false);
      return;
    }

    let cancelled = false;
    setAvailabilityLoading(true);
    apiClient
      .get(`/courts/${selectedCourt.id}/availability`, { date: selectedDateKey })
      .then((res) => {
        if (cancelled) return;
        setAvailability(res.ok ? res.data : null);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isCustomVenue, selectedCourt?.id, selectedDateKey]);

  const selectedSlot = availability?.slots?.find((slot) => slot.start === selectedTimeKey);
  const selectedSlotBlocked = Boolean(
    !isCustomVenue &&
      selectedCourt &&
      selectedDateKey &&
      selectedSlot &&
      isSlotUnavailable(selectedSlot) &&
      !selectedSlot.isMine
  );

  const canNext = () => {
    if (step === 0) return form.title.trim().length > 1;
    if (step === 1) {
      if (isCustomVenue) return form.customLocation.trim().length > 1;
      return !!form.clubId && !!form.courtId;
    }
    if (step === 2) return !selectedSlotBlocked;
    return false;
  };

  const handleNext = () => {
    if (step < 2) setStep((s) => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    const location = isCustomVenue ? form.customLocation.trim() : (selectedClub?.name ?? form.clubId);
    const courtName = isCustomVenue ? form.customCourtName.trim() : (selectedCourt?.name ?? "");

    if (!form.scheduledAt) {
      toast.error("لطفاً تاریخ بازی را انتخاب کنید");
      return;
    }

    if (!form.title || !location) {
      toast.error("لطفاً تمام فیلدها را پر کنید");
      return;
    }
    if (selectedSlotBlocked) {
      toast.error("این تایم برای این زمین رزرو شده و قابل انتخاب نیست");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        sportType: form.sportType,
        location,
        courtName,
        courtId: isCustomVenue ? undefined : form.courtId,
        scheduledAt: form.scheduledAt,
        teamSize: form.teamSize,
        isCertified: form.isCertified,
      };
      const res = await matchService.createMatch(payload);
      if (res.ok) {
        setMatches((prev) => [res.data.match, ...prev]);
        toast.success("بازی با موفقیت ساخته شد 🎉");
        setOpen(false);
      } else {
        toast.error(res.data?.message ?? "خطا در ایجاد بازی");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[92vh] flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1">
              <h2 className="font-black text-lg">ساخت بازی جدید</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{STEPS[step]}</p>
            </div>
          </div>

          {/* Step progress bar */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-400",
                  i === step
                    ? "bg-primary flex-[2]"
                    : i < step
                    ? "bg-primary/50 flex-1"
                    : "bg-muted flex-1"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <AnimatePresence mode="wait">
            {step === 0 && <StepSport key="s0" form={form} setForm={setForm} />}
            {step === 1 && (
              <StepClub
                key="s1"
                form={form}
                setForm={setForm}
                clubs={clubs}
                clubsLoading={clubsLoading}
                availableCourts={availableCourts}
              />
            )}
            {step === 2 && (
              <StepTime
                key="s2"
                form={form}
                setForm={setForm}
                selectedClub={selectedClub}
                selectedCourt={selectedCourt}
                availability={availability}
                availabilityLoading={availabilityLoading}
                isCustomVenue={isCustomVenue}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t border-border bg-background shrink-0">
          <button
            onClick={handleNext}
            disabled={loading || (step < 2 && !canNext())}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]",
              (step === 2 || canNext()) && !loading
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? "در حال ایجاد..." : step < 2 ? "بعدی" : "ساخت بازی 🎮"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ─── Step 1: Sport + Title ─────────────────────────────────────────────── */
function StepSport({ form, setForm }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.22 }}
      className="space-y-5 py-2"
    >
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">نوع ورزش</label>
        <div className="grid grid-cols-5 gap-2">
          {SPORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, sportType: s.value }))}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all",
                form.sportType === s.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/50"
              )}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className={cn(
                "text-[10px] font-semibold",
                form.sportType === s.value ? "text-primary" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">نام بازی</label>
        <input
          autoFocus
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="مثلاً: دوستانه پدل شنبه"
          className="w-full bg-muted border-2 border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
      </div>
    </motion.div>
  );
}

/* ─── Step 2: Club + Court ──────────────────────────────────────────────── */
function StepClub({ form, setForm, clubs, clubsLoading, availableCourts }) {
  const isCustom = form.venueMode === "custom";
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.22 }}
      className="space-y-5 py-2"
    >
      {/* Venue mode toggle: باشگاه‌های ما / زمین غیر پلتفرم */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, venueMode: "platform" }))}
          className={cn(
            "py-2.5 rounded-xl text-xs font-bold transition-all",
            !isCustom ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          باشگاه‌های ما
        </button>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, venueMode: "custom" }))}
          className={cn(
            "py-2.5 rounded-xl text-xs font-bold transition-all",
            isCustom ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          زمین دیگر
        </button>
      </div>

      {isCustom ? (
        <>
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">نام مجموعه / محل بازی</label>
            <input
              autoFocus
              value={form.customLocation}
              onChange={(e) => setForm((f) => ({ ...f, customLocation: e.target.value }))}
              placeholder="مثلاً: مجموعه ورزشی انقلاب"
              className="w-full bg-muted border-2 border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">نام زمین (اختیاری)</label>
            <input
              value={form.customCourtName}
              onChange={(e) => setForm((f) => ({ ...f, customCourtName: e.target.value }))}
              placeholder="مثلاً: زمین شماره ۲"
              className="w-full bg-muted border-2 border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </>
      ) : (
      <>
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">انتخاب باشگاه</label>
        {clubsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : clubs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">باشگاهی یافت نشد</p>
        ) : (
          <div className="space-y-2">
            {clubs.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, clubId: club.id, courtId: "" }))}
                className={cn(
                  "w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-right transition-all",
                  form.clubId === club.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  form.clubId === club.id ? "bg-primary/20" : "bg-muted"
                )}>
                  <BuildingIcon className={cn(
                    "w-5 h-5",
                    form.clubId === club.id ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-semibold text-sm text-foreground truncate">{club.name}</p>
                  {club.address && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{club.address}</p>
                  )}
                </div>
                {form.clubId === club.id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <CheckIcon className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {form.clubId && (
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">انتخاب زمین</label>
          {availableCourts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">زمینی در این باشگاه وجود ندارد</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableCourts.map((court) => (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, courtId: court.id }))}
                  className={cn(
                    "flex flex-col items-start p-3.5 rounded-2xl border-2 text-right transition-all",
                    form.courtId === court.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <div className="flex w-full justify-between items-center mb-2">
                    <MapPinIcon className={cn(
                      "w-4 h-4",
                      form.courtId === court.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    {form.courtId === court.id && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <CheckIcon className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-foreground leading-tight">{court.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-1">{court.sportType}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}
    </motion.div>
  );
}

/* ─── Step 3: Date/Time + Team size ─────────────────────────────────────── */
function StepTime({ form, setForm, selectedClub, selectedCourt, availability, availabilityLoading, isCustomVenue }) {
  const selectedDateKey = getDatePart(form.scheduledAt);
  const selectedTimeKey = getTimePart(form.scheduledAt);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.22 }}
      className="space-y-5 py-2"
    >
      {/* Summary card */}
      <div className="bg-muted/50 rounded-2xl p-4 flex gap-3 items-center">
        <span className="text-3xl leading-none">{SPORTS.find((s) => s.value === form.sportType)?.icon}</span>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground truncate">{form.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {form.venueMode === "custom"
              ? `${form.customLocation}${form.customCourtName ? ` · ${form.customCourtName}` : ""}`
              : `${selectedClub?.name ?? ""}${selectedCourt ? ` · ${selectedCourt.name}` : ""}`}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          زمان بازی <span className="text-destructive">*</span>
        </label>
        <PersianDateTimeInput
          value={form.scheduledAt}
          onChange={(value) => setForm((f) => ({ ...f, scheduledAt: value }))}
        />
      </div>

      {!isCustomVenue && selectedCourt && (
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">اسلات‌های زمین در همین تاریخ</label>

          {!selectedDateKey ? (
            <p className="text-xs text-muted-foreground rounded-2xl bg-muted/40 p-3 text-center">اول تاریخ رو انتخاب کن تا تایم‌های آزاد نمایش داده بشه</p>
          ) : availabilityLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-11 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (availability?.slots?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground rounded-2xl bg-muted/40 p-3 text-center">تایم فعالی برای این تاریخ پیدا نشد</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(availability?.slots ?? []).map((slot) => {
                const selected = selectedTimeKey === slot.start;
                const unavailable = isSlotUnavailable(slot);
                const disabled = unavailable && !slot.isMine;

                return (
                  <button
                    key={`${slot.start}-${slot.end}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => setForm((f) => ({ ...f, scheduledAt: `${selectedDateKey}T${slot.start}` }))}
                    className={cn(
                      "relative rounded-xl border-2 py-2.5 text-xs font-bold transition-all",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : disabled
                        ? "border-border bg-muted/30 text-muted-foreground/60 line-through cursor-not-allowed"
                        : slot.isMine
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-border bg-muted/40 text-foreground"
                    )}
                  >
                    <span>{slot.start}</span>
                    {slot.isMine && (
                      <span className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">رزرو خودت</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          تعداد بازیکن هر تیم
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setForm((f) => ({ ...f, teamSize: n }))}
              className={cn(
                "flex-1 py-3.5 rounded-2xl border-2 text-sm font-bold transition-all",
                form.teamSize === n
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground"
              )}
            >
              {n}v{n}
            </button>
          ))}
        </div>
      </div>

      {/* Certified toggle */}
      <button
        type="button"
        onClick={() => setForm((f) => ({ ...f, isCertified: !f.isCertified }))}
        className={cn(
          "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all",
          form.isCertified
            ? "border-emerald-500/50 bg-emerald-500/8"
            : "border-border bg-muted/30"
        )}
      >
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          form.isCertified ? "bg-emerald-500/20" : "bg-muted"
        )}>
          <ShieldCheckIcon className={cn(
            "w-5 h-5 transition-colors",
            form.isCertified ? "text-emerald-500" : "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className={cn(
            "font-bold text-sm transition-colors",
            form.isCertified ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
          )}>
            گارانتی رکت‌زون
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {form.isCertified
              ? "اگه مچ پر نشه، رکت‌زون ۲ ساعت قبل جایگزین می‌فرسته ✓"
              : "رکت‌زون تضمین می‌کنه بازی برگزار میشه"}
          </p>
        </div>
        <div className={cn(
          "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
          form.isCertified ? "bg-emerald-500 border-emerald-500" : "border-border"
        )}>
          {form.isCertified && <CheckIcon className="w-3 h-3 text-white" />}
        </div>
      </button>
    </motion.div>
  );
}
