import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { XIcon, GiftIcon, CoinsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createTournamentOpenAtom, tournamentsAtom } from "../store/tournamentStore";
import { tournamentService } from "../services/tournamentService";

const SPORTS = ["padel", "tennis", "squash", "badminton", "ping-pong"];

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

export default function CreateTournamentSheet({ onCreated }) {
  const setOpen = useSetAtom(createTournamentOpenAtom);
  const setTournaments = useSetAtom(tournamentsAtom);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  function field(key) {
    return {
      value: form[key],
      onChange: (e) =>
        setForm((prev) => ({
          ...prev,
          [key]: e.target.type === "number" ? Number(e.target.value) : e.target.value,
        })),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.registrationDeadline || !form.startDate || !form.endDate) {
      toast.error("لطفاً همه فیلدهای اجباری را پر کنید");
      return;
    }

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
        setOpen(false);
        onCreated?.(res.data.tournament);
      } else {
        toast.error(res.data?.message ?? "خطا در ایجاد تورنومنت");
      }
    } finally {
      setLoading(false);
    }
  }

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
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="font-black text-lg">ایجاد تورنومنت</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <XIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Field label="عنوان تورنومنت *">
            <input
              placeholder="مثال: مسابقات پادل بهاره"
              className={inputClass}
              {...field("title")}
            />
          </Field>

          <Field label="توضیحات">
            <textarea
              placeholder="توضیح مختصری از مسابقه..."
              rows={3}
              className={cn(inputClass, "resize-none")}
              {...field("description")}
            />
          </Field>

          <Field label="نوع ورزش *">
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, sportType: s }))}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    form.sportType === s
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {/* Free / Paid toggle */}
          <Field label="نوع ورودیه">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isFree: true }))}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                  form.isFree
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-muted border-border text-muted-foreground"
                )}
              >
                🎁 رایگان
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isFree: false }))}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                  !form.isFree
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-muted border-border text-muted-foreground"
                )}
              >
                <CoinsIcon className="w-3.5 h-3.5" /> پولی
              </button>
            </div>
          </Field>

          {!form.isFree && (
            <Field label="مبلغ ورودیه (تومان) *">
              <input type="number" min={1000} step={1000} className={inputClass} {...field("entryFee")} />
            </Field>
          )}

          <Field label="حداکثر شرکت‌کنندگان">
            <input type="number" min={2} max={256} className={inputClass} {...field("maxParticipants")} />
          </Field>

          <Field label="حداقل سطح (1–10)">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                className="flex-1"
                {...field("minLevel")}
              />
              <span className="w-6 text-center font-bold text-foreground text-sm">{form.minLevel}</span>
            </div>
          </Field>

          <Field label="مهلت ثبت‌نام *">
            <input type="datetime-local" className={inputClass} {...field("registrationDeadline")} />
          </Field>

          <Field label="تاریخ شروع *">
            <input type="datetime-local" className={inputClass} {...field("startDate")} />
          </Field>

          <Field label="تاریخ پایان *">
            <input type="datetime-local" className={inputClass} {...field("endDate")} />
          </Field>

          <Field label="جوایز مسابقه">
            <div className="relative">
              <GiftIcon className="absolute right-3 top-3 w-4 h-4 text-amber-500 pointer-events-none" />
              <textarea
                placeholder={"🥇 اول: ...\n🥈 دوم: ...\n🥉 سوم: ..."}
                rows={3}
                className={cn(inputClass, "resize-none pr-9")}
                {...field("prize")}
              />
            </div>
          </Field>

          <Field label="قوانین و توضیحات">
            <textarea
              placeholder="قوانین مسابقه، نحوه امتیازدهی و..."
              rows={4}
              className={cn(inputClass, "resize-none")}
              {...field("rules")}
            />
          </Field>

          <div className="h-4" />
        </form>

        <div className="px-5 pb-8 pt-3 border-t border-border bg-background">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-base shadow-lg disabled:opacity-60"
          >
            {loading ? "در حال ایجاد..." : "ایجاد تورنومنت 🏆"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const inputClass =
  "w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors";

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
