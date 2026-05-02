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
    <BottomSheet open={open} onDismiss={onClose} snapPoints={({ maxHeight }) => [maxHeight * 0.85]}>
      <div className="bg-background text-foreground min-h-[65vh] px-5 py-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">ویرایش پروفایل</h2>
          <button onClick={onClose} className="p-1.5 rounded-full bg-muted hover:bg-accent">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs mb-1.5 block">نام</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="نام شما"
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-1.5 block">بیوگرافی کوتاه</Label>
            <textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={3}
              maxLength={160}
              placeholder="چند کلمه درباره خودتان..."
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-left mt-0.5">{form.bio.length}/160</p>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-2 block">سطح مهارت</Label>
            <div className="grid grid-cols-4 gap-2">
              {SKILLS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set("skillLevel", s.value)}
                  className={cn(
                    "py-2 rounded-xl border text-xs font-medium transition-all",
                    form.skillLevel === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-2 block">ورزش مورد علاقه</Label>
            <div className="grid grid-cols-4 gap-2">
              {SPORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set("favoriteSport", s.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all",
                    form.favoriteSport === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-[10px]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl font-bold py-5 mt-2">
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
