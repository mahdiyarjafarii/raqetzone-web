import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarIcon, ClockIcon, BanknoteIcon, FileTextIcon, WalletIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPersianDateInTehran } from "@/lib/timezone";
import { walletService } from "@/features/wallet/walletService";
import { bulkItemPrice } from "@/features/booking/utils/pricing";

const SPORT_ICONS = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };

function formatDateFa(dateStr) {
  return formatPersianDateInTehran(dateStr, { weekday: "long", month: "long", day: "numeric" });
}

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

export default function BulkBookingSummary({ items, onConfirm, onBack, onRemove, submitting }) {
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("none");
  const [wallet, setWallet] = useState(null);

  const totalPrice = useMemo(() => items.reduce((sum, it) => sum + bulkItemPrice(it), 0), [items]);
  const canPayWithWallet = (wallet?.balance ?? 0) >= totalPrice;

  useEffect(() => {
    let alive = true;
    walletService.getWallet().then((res) => {
      if (alive && res.ok) setWallet(res.data.wallet);
    });
    return () => { alive = false; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pb-8 space-y-4"
    >
      {/* Sessions list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">سانس‌های انتخاب‌شده</p>
          <span className="text-xs text-primary font-bold">{formatPrice(items.length)} سانس</span>
        </div>

        <div className="divide-y divide-border">
          {items.map((it) => (
            <div key={`${it.court.id}-${it.date}-${it.slot.start}`} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{SPORT_ICONS[it.court.sportType] ?? "🏅"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{it.court.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <CalendarIcon className="w-3 h-3" />
                  {formatDateFa(it.date)}
                  <ClockIcon className="w-3 h-3 mr-1" />
                  {it.slot.start} تا {it.slot.end}
                </p>
              </div>
              <span className="text-xs font-medium text-foreground whitespace-nowrap">{formatPrice(bulkItemPrice(it))} ت</span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(it)}
                  disabled={submitting}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  aria-label="حذف سانس"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              )}
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
          یادداشت (اختیاری — برای همه سانس‌ها)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="هر توضیح اضافه‌ای برای مدیر زمین..."
          className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors resize-none"
        />
      </div>

      {/* Payment method */}
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
              کل مبلغ یکجا پرداخت می‌شود
            </span>
          </button>
        </div>
      </div>

      {/* Status notice */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
        ⏳ همه سانس‌ها برای بررسی مدیر زمین ارسال می‌شوند. اگر حتی یکی از سانس‌ها قابل ثبت نباشد، کل درخواست ثبت نمی‌شود.
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="flex-1 rounded-xl">
          بازگشت
        </Button>
        <Button
          onClick={() => onConfirm(paymentMethod, notes)}
          disabled={submitting || items.length === 0}
          className="flex-2 rounded-xl font-bold"
        >
          {submitting ? "در حال ثبت..." : `ثبت ${formatPrice(items.length)} سانس`}
        </Button>
      </div>
    </motion.div>
  );
}
