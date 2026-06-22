import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClockIcon, XIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const persianNumberFormat = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 });
const hourOptions = Array.from({ length: 25 }, (_, hour) => String(hour).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function formatPersianTime(value) {
  const [hour = "12", minute = "00"] = (value || "12:00").split(":");
  return `${persianNumberFormat.format(Number(hour))}:${persianNumberFormat.format(Number(minute))}`;
}

export default function PersianTimePicker({ label, value, onChange, required = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const [hour = "12", minute = "00"] = (value || "12:00").split(":");

  function emit(nextHour, nextMinute) {
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-xs font-semibold text-muted-foreground">
          {label}{required ? " *" : ""}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/30 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClockIcon className="h-4 w-4" />
            <span className="text-xs">انتخاب ساعت</span>
          </div>
          <span className="font-black text-base tabular-nums text-foreground">{formatPersianTime(value)}</span>
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
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[110] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-4 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
                <div className="flex-1 text-right">
                  <h3 className="text-base font-black text-foreground">انتخاب ساعت</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">ساعت و دقیقه را جدا انتخاب کنید</p>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">زمان انتخاب‌شده</p>
                <p className="mt-1 text-2xl font-black text-primary tabular-nums">{formatPersianTime(`${hour}:${minute}`)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-center text-xs font-bold text-muted-foreground">ساعت</p>
                  <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto rounded-2xl bg-muted/30 p-2">
                    {hourOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => emit(option, minute)}
                        className={cn(
                          "relative rounded-xl border py-2.5 text-sm font-black transition-all",
                          hour === option ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-background text-foreground hover:border-primary/40"
                        )}
                      >
                        {hour === option && <CheckIcon className="absolute right-1 top-1 h-3 w-3" />}
                        {persianNumberFormat.format(Number(option))}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-center text-xs font-bold text-muted-foreground">دقیقه</p>
                  <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-2xl bg-muted/30 p-2">
                    {minuteOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => emit(hour, option)}
                        className={cn(
                          "relative rounded-xl border py-2.5 text-sm font-black transition-all",
                          minute === option ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-background text-foreground hover:border-primary/40"
                        )}
                      >
                        {minute === option && <CheckIcon className="absolute right-1 top-1 h-3 w-3" />}
                        {persianNumberFormat.format(Number(option))}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 h-12 w-full rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
              >
                تایید ساعت
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
