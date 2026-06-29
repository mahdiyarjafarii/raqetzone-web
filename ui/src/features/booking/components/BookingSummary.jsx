import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPinIcon, CalendarIcon, ClockIcon, BanknoteIcon, FileTextIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPersianDateInTehran } from "@/lib/timezone";
import { walletService } from "@/features/wallet/walletService";

const SPORT_ICONS = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };

function formatDateFa(dateStr) {
  return formatPersianDateInTehran(dateStr, {
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
  const [paymentMethod, setPaymentMethod] = useState("none");
  const [wallet, setWallet] = useState(null);

  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const startMin = toMin(slot.start);
  const rawEndMin = toMin(slot.end);
  const endMin = rawEndMin <= startMin ? rawEndMin + 1440 : rawEndMin;
  const durationHours = (endMin - startMin) / 60;
  const totalPrice = Math.round(court.pricePerHour * durationHours);
  const canPayWithWallet = (wallet?.balance ?? 0) >= totalPrice;

  useEffect(() => {
    let alive = true;
    walletService.getWallet().then((res) => {
      if (alive && res.ok) setWallet(res.data.wallet);
    });
    return () => { alive = false; };
  }, []);

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

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
          <WalletIcon className="w-4 h-4 text-primary" />
          <p className="text-xs text-muted-foreground font-medium">روش پرداخت</p>
        </div>
        <div className="p-3 grid gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("none")}
            className={cn(
              "rounded-xl border px-3 py-3 text-right text-sm transition-colors",
              paymentMethod === "none" ? "border-primary bg-primary/10" : "border-border bg-muted/30"
            )}
          >
            پرداخت مستقیم / تسویه عادی
          </button>
          <button
            type="button"
            onClick={() => canPayWithWallet && setPaymentMethod("wallet")}
            disabled={!canPayWithWallet}
            className={cn(
              "rounded-xl border px-3 py-3 text-right text-sm transition-colors disabled:opacity-50",
              paymentMethod === "wallet" ? "border-primary bg-primary/10" : "border-border bg-muted/30"
            )}
          >
            <span className="font-bold">پرداخت از کیف پول</span>
            <span className="block text-xs text-muted-foreground mt-1">
              موجودی: {formatPrice(wallet?.balance ?? 0)} تومان
              {!canPayWithWallet ? " · موجودی کافی نیست" : ""}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("online")}
            className={cn(
              "rounded-xl border px-3 py-3 text-right text-sm transition-colors",
              paymentMethod === "online" ? "border-primary bg-primary/10" : "border-border bg-muted/30"
            )}
          >
            <span className="font-bold">پرداخت آنلاین (زرین‌پال)</span>
            <span className="block text-xs text-muted-foreground mt-1">
              پس از ثبت، به درگاه پرداخت منتقل می‌شوید
            </span>
          </button>
        </div>
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
          onClick={() => onConfirm(notes, paymentMethod)}
          disabled={submitting}
          className="flex-2 rounded-xl font-bold"
        >
          {submitting ? "در حال ثبت..." : "ثبت درخواست رزرو"}
        </Button>
      </div>
    </motion.div>
  );
}
