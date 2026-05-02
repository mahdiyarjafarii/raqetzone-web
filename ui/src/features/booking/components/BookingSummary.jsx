import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPinIcon, CalendarIcon, ClockIcon, BanknoteIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPORT_ICONS = { padel: "🏓", tennis: "🎾", squash: "🟡", badminton: "🏸" };

function formatDateFa(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

export default function BookingSummary({ court, date, slot, onConfirm, onBack, submitting }) {
  const [notes, setNotes] = useState("");

  const startMin = slot.start.split(":").reduce((h, m, i) => h + (i === 0 ? +m * 60 : +m), 0);
  const endMin = slot.end.split(":").reduce((h, m, i) => h + (i === 0 ? +m * 60 : +m), 0);
  const durationHours = (endMin - startMin) / 60;
  const totalPrice = Math.round(court.pricePerHour * durationHours);

  const rows = [
    { icon: <span className="text-lg">{SPORT_ICONS[court.sportType] ?? "🏅"}</span>, label: "زمین", value: court.name },
    { icon: <MapPinIcon className="w-4 h-4 text-muted-foreground" />, label: "مکان", value: court.location },
    { icon: <CalendarIcon className="w-4 h-4 text-muted-foreground" />, label: "تاریخ", value: formatDateFa(date) },
    { icon: <ClockIcon className="w-4 h-4 text-muted-foreground" />, label: "زمان", value: `${slot.start} تا ${slot.end}` },
    { icon: <ClockIcon className="w-4 h-4 text-muted-foreground" />, label: "مدت", value: `${durationHours} ساعت` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pb-8 space-y-4"
    >
      {/* Invoice card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">فاکتور رزرو</p>
        </div>

        <div className="divide-y divide-border">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                {row.icon}
                <span>{row.label}</span>
              </div>
              <span className="text-foreground text-sm font-medium text-left">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-4 py-4 bg-primary/5 border-t border-primary/20">
          <div className="flex items-center gap-2 text-primary font-bold">
            <BanknoteIcon className="w-4 h-4" />
            <span>مبلغ کل</span>
          </div>
          <span className="text-primary font-black text-lg">
            {formatPrice(totalPrice)} <span className="text-sm font-medium">تومان</span>
          </span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <FileTextIcon className="w-3.5 h-3.5" />
          یادداشت (اختیاری)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="هر توضیح اضافه‌ای برای مدیر زمین..."
          className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors resize-none"
        />
      </div>

      {/* Status notice */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
        ⏳ درخواست رزرو شما برای بررسی مدیر زمین ارسال می‌شود. پس از تأیید، رزرو شما نهایی خواهد شد.
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 rounded-xl"
        >
          بازگشت
        </Button>
        <Button
          onClick={() => onConfirm(notes)}
          disabled={submitting}
          className="flex-2 rounded-xl font-bold"
        >
          {submitting ? "در حال ثبت..." : "ثبت درخواست رزرو"}
        </Button>
      </div>
    </motion.div>
  );
}
