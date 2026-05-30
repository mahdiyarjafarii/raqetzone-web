import React, { useState, useEffect } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileService } from "../services/profileService";

const SKILLS = [
  { value: "beginner",     label: "مبتدی" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced",     label: "پیشرفته" },
  { value: "pro",          label: "حرفه‌ای" },
];

const SPORTS = [
  { value: "padel",    label: "پادل",      icon: "🏓" },
  { value: "tennis",   label: "تنیس",      icon: "🎾" },
  { value: "squash",   label: "اسکواش",    icon: "🟡" },
  { value: "badminton",label: "بدمینتون",  icon: "🏸" },
];

export default function EditProfileSheet({ open, onClose, user, onSaved }) {
  const [form, setForm] = useState({ name: "", bio: "", skillLevel: "beginner", favoriteSport: "padel" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name:          user.name          ?? "",
        bio:           user.bio           ?? "",
        skillLevel:    user.skillLevel    ?? "beginner",
        favoriteSport: user.favoriteSport ?? "padel",
      });
    }
  }, [user]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await profileService.updateProfile(form);
      if (res.ok) {
        toast.success("پروفایل به‌روز شد ✓");
        onSaved?.(res.data.user);
        onClose();
      } else {
        toast.error(res.data?.message ?? "خطا در ذخیره");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onDismiss={onClose} snapPoints={({ maxHeight }) => [maxHeight * 0.88]}>
      <div className="bg-[#fbfaf8] dark:bg-background text-foreground min-h-[68vh] px-4 pt-4 pb-6">
        <div className="relative overflow-hidden rounded-[28px] border border-white/80 dark:border-white/10 bg-white/90 dark:bg-card/80 px-4 pt-5 pb-4 shadow-xl shadow-slate-200/60 dark:shadow-black/20 backdrop-blur-xl mb-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.16),transparent_40%),radial-gradient(circle_at_top_left,rgba(236,72,153,0.12),transparent_34%)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-primary mb-1">پروفایل بازیکن</p>
              <h2 className="font-black text-2xl tracking-tight">ویرایش پروفایل</h2>
            </div>
            <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/10 border border-black/[0.06] dark:border-white/10 flex items-center justify-center active:scale-95 transition-transform">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="relative mt-3 text-xs text-muted-foreground leading-relaxed">
            اطلاعاتت رو کوتاه و دقیق نگه دار تا بقیه بازیکن‌ها سریع‌تر بشناسنت.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold block">نام</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="نام شما"
              className="h-14 rounded-2xl bg-white/90 dark:bg-card border-black/[0.06] dark:border-border text-base font-bold shadow-sm px-4"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs font-bold block">بیوگرافی کوتاه</Label>
              <p className="text-[10px] text-muted-foreground font-semibold">{form.bio.length}/160</p>
            </div>
            <textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={3}
              maxLength={160}
              placeholder="چند کلمه درباره خودتان..."
              className="w-full bg-white/90 dark:bg-card border border-black/[0.06] dark:border-border rounded-[22px] px-4 py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/70 shadow-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 resize-none transition-all"
            />
          </div>

          <div className="space-y-2.5">
            <Label className="text-muted-foreground text-xs font-bold block">سطح مهارت</Label>
            <div className="grid grid-cols-4 gap-2">
              {SKILLS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set("skillLevel", s.value)}
                  className={cn(
                    "h-12 rounded-2xl border text-xs font-black transition-all active:scale-95",
                    form.skillLevel === s.value
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border-black/[0.06] dark:border-border bg-white/80 dark:bg-card text-muted-foreground shadow-sm"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-muted-foreground text-xs font-bold block">ورزش مورد علاقه</Label>
            <div className="grid grid-cols-4 gap-2">
              {SPORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set("favoriteSport", s.value)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 py-3 rounded-[22px] border text-xs transition-all active:scale-95 overflow-hidden",
                    form.favoriteSport === s.value
                      ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10"
                      : "border-black/[0.06] dark:border-border bg-white/80 dark:bg-card text-muted-foreground shadow-sm"
                  )}
                >
                  {form.favoriteSport === s.value && (
                    <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <span className="text-2xl leading-none">{s.icon}</span>
                  <span className="text-[11px] font-bold">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sticky bottom-0 pt-2 bg-gradient-to-t from-[#fbfaf8] dark:from-background via-[#fbfaf8] dark:via-background to-transparent">
            <Button onClick={handleSave} disabled={saving} className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/25 active:scale-[0.98] transition-transform">
              {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
