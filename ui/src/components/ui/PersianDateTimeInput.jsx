import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRightIcon, CheckIcon, CalendarIcon, ClockIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addDaysToDateKey,
  formatPersianDateInTehran,
  getTodayDateKeyInTehran,
} from "@/lib/timezone";

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

function getDatePart(value) {
  return value?.split("T")[0] ?? "";
}

function getTimePart(value, fallback = "12:00") {
  return value?.split("T")[1] ?? fallback;
}

/**
 * Reusable Persian (Jalali) date & time picker styled to match the rest of the app.
 *
 * mode="datetime" (default): emits `YYYY-MM-DDTHH:mm`.
 * mode="time": time-only picker, emits `HH:mm`.
 */
export default function PersianDateTimeInput({
  value,
  onChange,
  className,
  mode = "datetime",
  label = "تاریخ و ساعت",
  title = "انتخاب زمان",
  dateHint = "اول تاریخ را انتخاب کن",
  timeHint = "حالا ساعت را مشخص کن",
  placeholder = "انتخاب تاریخ و ساعت",
  confirmLabel = "تایید",
  defaultTime = "12:00",
}) {
  const timeOnly = mode === "time";
  const [open, setOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState(timeOnly ? "time" : "date");

  const datePart = timeOnly ? "" : getDatePart(value);
  const timePart = timeOnly ? (value || defaultTime) : getTimePart(value, defaultTime);
  const selectedDateLabel = persianDateOptions.find((option) => option.value === datePart)?.label;
  const [hour = defaultTime.split(":")[0], minute = defaultTime.split(":")[1]] = timePart.split(":");

  const hasValue = timeOnly ? Boolean(value) : Boolean(datePart);

  function emit(nextDate, nextTime) {
    if (timeOnly) {
      onChange(nextTime);
      return;
    }
    if (!nextDate) return;
    onChange(`${nextDate}T${nextTime}`);
  }

  function handleDateSelect(nextDate) {
    emit(nextDate, timePart);
    setPickerStep("time");
  }

  const triggerLabel = timeOnly
    ? (hasValue ? `ساعت ${persianNumberFormat.format(Number(hour))}:${persianNumberFormat.format(Number(minute))}` : placeholder)
    : (datePart ? `${selectedDateLabel}، ساعت ${persianNumberFormat.format(Number(hour))}:${persianNumberFormat.format(Number(minute))}` : placeholder);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setPickerStep(timeOnly || datePart ? "time" : "date");
          setOpen(true);
        }}
        className={cn(
          "w-full rounded-3xl border-2 bg-muted/60 px-4 py-4 text-right transition-all active:scale-[0.99]",
          hasValue ? "border-primary/40 shadow-lg shadow-primary/10" : "border-border"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {timeOnly ? <ClockIcon className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">{label}</p>
            <p className={cn("text-sm font-black truncate", hasValue ? "text-foreground" : "text-muted-foreground")}>
              {triggerLabel}
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
              className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[120] mx-auto max-w-screen md:max-w-120 rounded-t-[2rem] bg-background border-t border-border shadow-2xl max-h-[82vh] overflow-hidden flex flex-col"
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
                    <h3 className="font-black text-lg">{title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pickerStep === "date" ? dateHint : timeHint}
                    </p>
                  </div>
                </div>

                {!timeOnly && (
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
                )}

                {pickerStep === "date" && !timeOnly ? (
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
                    {!timeOnly && (
                      <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">تاریخ انتخاب‌شده</p>
                        <p className="font-black text-sm text-foreground">{selectedDateLabel}</p>
                      </div>
                    )}

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
                      {confirmLabel}
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
