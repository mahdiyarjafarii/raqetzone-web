import React, { useState } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { XIcon } from "lucide-react";

import { createMatchOpenAtom, matchesAtom } from "@/store/matchStore";
import { matchService } from "@/services/matchService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SPORTS = [
  { value: "padel", label: "پادل", icon: "🏓" },
  { value: "tennis", label: "تنیس", icon: "🎾" },
  { value: "squash", label: "اسکواش", icon: "🟡" },
  { value: "badminton", label: "بدمینتون", icon: "🏸" },
  { value: "ping-pong", label: "پینگ‌پنگ", icon: "🏓" },
];

const defaultForm = {
  title: "",
  sportType: "padel",
  location: "",
  courtName: "",
  scheduledAt: "",
  teamSize: 2,
};

export default function CreateMatchSheet() {
  const [open, setOpen] = useAtom(createMatchOpenAtom);
  const setMatches = useSetAtom(matchesAtom);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.location || !form.scheduledAt) {
      toast.error("لطفاً تمام فیلدها را پر کنید");
      return;
    }
    setLoading(true);
    try {
      const res = await matchService.createMatch(form);
      if (res.ok) {
        setMatches((prev) => [res.data.match, ...prev]);
        toast.success("مسابقه با موفقیت ایجاد شد 🎉");
        setForm(defaultForm);
        setOpen(false);
      } else {
        toast.error(res.data?.message ?? "خطا در ایجاد مسابقه");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={() => setOpen(false)}
      snapPoints={({ maxHeight }) => [maxHeight * 0.9]}
    >
      <div className="bg-background text-foreground min-h-[70vh] px-5 py-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">ایجاد مسابقه جدید</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-full bg-muted hover:bg-accent transition-colors"
          >
            <XIcon className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs mb-1.5 block">عنوان مسابقه</Label>
            <Input
              placeholder="مثلاً: مسابقه دوستانه پادل"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-1.5 block">نوع ورزش</Label>
            <div className="grid grid-cols-5 gap-2">
              {SPORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleChange("sportType", s.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-xs",
                    form.sportType === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  <span className="text-lg">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-1.5 block">مکان</Label>
            <Input
              placeholder="شهر / منطقه"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-1.5 block">نام زمین (اختیاری)</Label>
            <Input
              placeholder="مثلاً: زمین شماره ۳"
              value={form.courtName}
              onChange={(e) => handleChange("courtName", e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-1.5 block">زمان مسابقه</Label>
            <Input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => handleChange("scheduledAt", e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-1.5 block">
              تعداد بازیکن هر تیم: {form.teamSize}
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleChange("teamSize", n)}
                  className={cn(
                    "flex-1 py-2 rounded-xl border text-sm font-semibold transition-all",
                    form.teamSize === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl font-bold py-5 mt-2"
          >
            {loading ? "در حال ایجاد..." : "ایجاد مسابقه ✨"}
          </Button>
        </form>
      </div>
    </BottomSheet>
  );
}
