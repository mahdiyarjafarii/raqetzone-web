import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BotIcon, RefreshCwIcon, SparklesIcon, ClockIcon, BanknoteIcon, CheckCircle2Icon, ZapIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import { cn, fmt } from "@/lib/utils";

function StatBox({ label, value, icon: Icon, tone = "primary" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", tones[tone])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-black text-foreground">{value}</p>
      </div>
    </div>
  );
}

function formatDateFa(dateStr) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString("fa-IR-u-ca-persian", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function OpportunityRow({ item, checked, onToggle }) {
  return (
    <motion.label
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid grid-cols-[auto_1.4fr_1fr_1fr_1fr] items-center gap-3 rounded-2xl border bg-card p-3 cursor-pointer transition-all",
        checked ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
      )}
    >
      <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} className="h-4 w-4 accent-primary" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{item.courtName}</p>
        <p className="text-[11px] text-muted-foreground truncate">{item.clubName ?? "باشگاه"} · {item.sportType}</p>
      </div>
      <div className="text-xs text-muted-foreground">{formatDateFa(item.date)} · <span dir="ltr">{item.startTime}-{item.endTime}</span></div>
      <div className="text-xs">
        <span className="line-through text-muted-foreground ml-2">{fmt(item.price)}</span>
        <span className="font-black text-primary">{fmt(item.finalPrice)} ت</span>
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-600">{item.discountPercent}٪</span>
        <span className="text-[11px] text-muted-foreground">{item.hoursLeft} ساعت</span>
      </div>
    </motion.label>
  );
}

export default function AutoFillPage({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState({ summary: {}, opportunities: [] });
  const [selected, setSelected] = useState(new Set());

  const fetchOpportunities = async () => {
    setLoading(true);
    const { ok, data: res } = await apiClient.get("/club-panel/autofill/opportunities", { days: 3 });
    setLoading(false);
    if (!ok) return toast.error(res?.message ?? "خطا در تحلیل سانس‌ها");
    setData(res);
    setSelected(new Set((res.opportunities ?? []).slice(0, 12).map(item => item.id)));
  };

  useEffect(() => { fetchOpportunities(); }, []);

  const selectedSlots = useMemo(
    () => (data.opportunities ?? []).filter(item => selected.has(item.id)),
    [data.opportunities, selected]
  );

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runAutoFill = async () => {
    if (selectedSlots.length === 0) return toast.error("حداقل یک سانس را انتخاب کنید");
    setRunning(true);
    const { ok, data: res } = await apiClient.post("/club-panel/autofill/run", { slots: selectedSlots });
    setRunning(false);
    if (!ok) return toast.error(res?.message ?? "خطا در اجرای پرکن هوشمند");
    if ((res.applied ?? 0) === 0) toast("همه سانس‌های انتخاب‌شده قبلاً تخفیف‌دار یا غیرقابل اجرا بودند");
    else toast.success(`${fmt(res.applied)} سانس به آفرهای ویژه اضافه شد و در اپ کاربر نمایش داده می‌شود`);
    fetchOpportunities();
  };

  const summary = data.summary ?? {};

  const content = (
    <div className={cn("space-y-6", embedded ? "" : "p-6")}>
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-amber-500/10 p-5 overflow-hidden relative">
          <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                <BotIcon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">پرکن درآمد سانس‌های خالی</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">سانس‌های خالی ۷۲ ساعت آینده را پیدا کن، با تخفیف هوشمند به آفر ویژه تبدیل کن و سریع جلوی چشم کاربران اپ ببر.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchOpportunities} disabled={loading} className="gap-2">
                <RefreshCwIcon className={cn("w-4 h-4", loading && "animate-spin")} />
                تحلیل دوباره
              </Button>
              <Button onClick={runAutoFill} disabled={running || selectedSlots.length === 0} className="gap-2">
                <ZapIcon className="w-4 h-4" />
                {running ? "در حال ساخت آفرها..." : `تبدیل به آفر ویژه (${fmt(selectedSlots.length)})`}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatBox label="سانس خالی پیدا شده" value={fmt(summary.emptySlots ?? 0)} icon={ClockIcon} tone="amber" />
          <StatBox label="ظرفیت فروش خالی" value={`${fmt(summary.revenuePotential ?? 0)} ت`} icon={BanknoteIcon} tone="emerald" />
          <StatBox label="میانگین تخفیف پیشنهادی" value={`${fmt(summary.avgDiscount ?? 0)}٪`} icon={SparklesIcon} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-foreground">سانس‌های آماده تبدیل به آفر</p>
              <p className="text-xs text-muted-foreground mt-0.5">بعد از اجرا، سانس‌ها تخفیف‌دار می‌شوند و از این لیست خارج می‌شوند.</p>
            </div>
            <button
              onClick={() => setSelected(new Set((data.opportunities ?? []).map(item => item.id)))}
              className="text-xs font-semibold text-primary hover:underline"
            >
              انتخاب همه
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}</div>
          ) : data.opportunities?.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <CheckCircle2Icon className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
              <p className="font-semibold text-foreground">فعلاً سانس خالی قابل پیشنهاد ندارید</p>
              <p className="text-sm mt-1">رزروها یا سانس‌های بسته‌شده را بررسی کنید.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.opportunities.map(item => <OpportunityRow key={item.id} item={item} checked={selected.has(item.id)} onToggle={toggle} />)}
            </div>
          )}
        </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div dir="rtl">
      <PageHeader title="پرکن هوشمند سانس‌ها" description="سانس‌های خالی ۷۲ ساعت آینده را پیدا کن، تخفیف بده و به آفرهای اپ اضافه کن" />
      {content}
    </div>
  );
}
