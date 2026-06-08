import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MegaphoneIcon, UsersIcon, CrownIcon, MoonIcon, SparklesIcon, ActivityIcon, TrophyIcon, SendIcon, TicketIcon, RefreshCwIcon, BotIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { cn, fmt } from "@/lib/utils";
import AutoFillPage from "@/pages/AutoFillPage";

const SEGMENT_META = {
  all: { icon: UsersIcon, color: "text-blue-600", bg: "bg-blue-500/10", title: "کمپین عمومی", template: "سلام {name} عزیز 👋\nباشگاه ما برای رزرو بعدی شما یک پیشنهاد ویژه دارد. با کد {code} از تخفیف {discount} استفاده کن.\nرکت‌زون" },
  vip: { icon: CrownIcon, color: "text-amber-600", bg: "bg-amber-500/10", title: "قدردانی از VIPها", template: "سلام {name} عزیز 👑\nبه پاس همراهی شما، کد اختصاصی {code} با تخفیف {discount} فعال شد. منتظر بازی بعدی شما هستیم!" },
  dormant: { icon: MoonIcon, color: "text-violet-600", bg: "bg-violet-500/10", title: "بازگردانی مشتری خوابیده", template: "سلام {name} عزیز، دلمون برات تنگ شده 😄\nبرای برگشت به زمین، کد {code} با تخفیف {discount} رو برات فعال کردیم. همین امروز رزرو کن." },
  new: { icon: SparklesIcon, color: "text-emerald-600", bg: "bg-emerald-500/10", title: "فعال‌سازی تازه‌واردها", template: "سلام {name} عزیز ✨\nبرای رزرو بعدی‌ات کد {code} با تخفیف {discount} آماده است. تجربه بازی بعدی رو از دست نده." },
  low_activity: { icon: ActivityIcon, color: "text-orange-600", bg: "bg-orange-500/10", title: "افزایش تکرار رزرو", template: "سلام {name} عزیز 🎾\nیک پیشنهاد کوتاه‌مدت برای رزرو بعدی داری: کد {code} با تخفیف {discount}. سانس مناسبت رو در رکت‌زون بگیر." },
  tournament: { icon: TrophyIcon, color: "text-pink-600", bg: "bg-pink-500/10", title: "دعوت تورنومنتی‌ها", template: "سلام {name} قهرمان 🏆\nبرای تمرین قبل از تورنومنت بعدی، کد {code} با تخفیف {discount} فعال شد. منتظرتیم!" },
};

function hasDiscountPlaceholder(text) {
  return /\{code\}|\{discount\}/.test(text);
}

function SegmentCard({ segment, onLaunch }) {
  const meta = SEGMENT_META[segment.key] ?? SEGMENT_META.all;
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", meta.bg)}>
            <Icon className={cn("w-5 h-5", meta.color)} />
          </div>
          <div>
            <p className="font-black text-foreground">{segment.label}</p>
            <p className="text-xs text-muted-foreground">{meta.title}</p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-foreground">{fmt(segment.count)} نفر</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-[10px] text-muted-foreground">تخفیف پیشنهادی</p>
          <p className="text-lg font-black text-primary">{segment.recommendedDiscount}٪</p>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-[10px] text-muted-foreground">هدف کمپین</p>
          <p className="text-xs font-bold text-foreground mt-1">{meta.title}</p>
        </div>
      </div>
      <Button onClick={() => onLaunch(segment)} disabled={segment.count === 0} className="w-full gap-2">
        <SendIcon className="w-4 h-4" />
        ساخت و ارسال کمپین
      </Button>
    </motion.div>
  );
}

function CampaignModal({ clubId, segment, codes, onClose }) {
  const meta = segment ? SEGMENT_META[segment.key] ?? SEGMENT_META.all : null;
  const bestCode = useMemo(() => codes.find(c => c.discountType === "percent" && Number(c.discountValue) >= Number(segment?.recommendedDiscount ?? 0)) ?? codes[0], [codes, segment]);
  const [discountCodeId, setDiscountCodeId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!segment || !meta) return;
    setDiscountCodeId(bestCode?.id ?? "");
    setMessage(meta.template);
  }, [segment?.key, bestCode?.id]);

  if (!segment) return null;
  const selectedCode = codes.find(c => c.id === discountCodeId);
  const preview = message
    .replace(/\{name\}/g, "علی")
    .replace(/\{code\}/g, selectedCode?.code ?? "بدون کد")
    .replace(/\{discount\}/g, selectedCode ? selectedCode.discountType === "percent" ? `${selectedCode.discountValue}٪` : `${fmt(selectedCode.discountValue)} تومان` : "بدون تخفیف");

  const send = async () => {
    if (!clubId) return toast.error("باشگاه را انتخاب کنید");
    if (!message.trim()) return toast.error("متن پیام خالی است");
    if (!discountCodeId && hasDiscountPlaceholder(message)) {
      return toast.error("برای این متن باید کد تخفیف انتخاب کنید یا بخش کد تخفیف را از متن حذف کنید");
    }
    setSending(true);
    const { ok, data } = await apiClient.post(`/club-panel/clubs/${clubId}/sms-campaign`, { discountCodeId: discountCodeId || undefined, message, recipientFilter: segment.key });
    setSending(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ارسال کمپین");
    toast.success(data.message ?? "کمپین ارسال شد");
    onClose();
  };

  return (
    <Modal open={!!segment} onClose={onClose} title={`کمپین ${segment.label}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-xs text-muted-foreground">گیرندگان هدف</p>
            <p className="text-2xl font-black text-primary">{fmt(segment.count)} نفر</p>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-xs text-muted-foreground">سگمنت</p>
            <p className="text-lg font-black text-foreground">{segment.label}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><TicketIcon className="w-3.5 h-3.5" />کد تخفیف</label>
          <select value={discountCodeId} onChange={e => setDiscountCodeId(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
            <option value="">بدون کد تخفیف</option>
            {codes.map(c => <option key={c.id} value={c.id}>{c.code} — {c.discountType === "percent" ? `${c.discountValue}٪` : `${fmt(c.discountValue)} تومان`}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">متن پیام</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-ring transition-colors resize-none leading-relaxed" />
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-[10px] font-semibold text-muted-foreground mb-2">پیش‌نمایش SMS</p>
          <div className="rounded-xl bg-card p-3 text-sm whitespace-pre-wrap leading-relaxed">{preview}</div>
        </div>

        <Button onClick={send} disabled={sending || segment.count === 0} className="w-full h-11 gap-2">
          {sending ? <><RefreshCwIcon className="w-4 h-4 animate-spin" />در حال ارسال...</> : <><SendIcon className="w-4 h-4" />ارسال کمپین</>}
        </Button>
      </div>
    </Modal>
  );
}

export default function MarketingPage() {
  const [clubs, setClubs] = useState([]);
  const [clubId, setClubId] = useState("");
  const [segments, setSegments] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState(null);
  const [tab, setTab] = useState("campaigns");

  useEffect(() => {
    apiClient.get("/club-panel/clubs").then(({ ok, data }) => {
      if (!ok) return toast.error("خطا در بارگذاری باشگاه‌ها");
      const rows = data.clubs ?? [];
      setClubs(rows);
      setClubId(rows[0]?.id ?? "");
    });
  }, []);

  const fetchMarketingData = async () => {
    if (!clubId) { setLoading(false); return; }
    setLoading(true);
    const [segmentsRes, codesRes] = await Promise.all([
      apiClient.get(`/club-panel/clubs/${clubId}/marketing-segments`),
      apiClient.get(`/club-panel/clubs/${clubId}/discount-codes`),
    ]);
    if (segmentsRes.ok) setSegments(segmentsRes.data.segments ?? []);
    else toast.error("خطا در تحلیل سگمنت‌ها");
    if (codesRes.ok) setCodes((codesRes.data ?? []).filter(c => c.isActive));
    setLoading(false);
  };

  useEffect(() => { fetchMarketingData(); }, [clubId]);

  const totalAudience = segments.find(s => s.key === "all")?.count ?? 0;
  const bestOpportunity = [...segments].sort((a, b) => b.recommendedDiscount * b.count - a.recommendedDiscount * a.count)[0];

  return (
    <div dir="rtl">
      <PageHeader title="رشد و مارکتینگ" description="کمپین‌های آماده برای بازگشت مشتری، افزایش رزرو و فعال‌سازی کامیونیتی" />
      <div className="p-6 space-y-6">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                <MegaphoneIcon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">Marketing Copilot</p>
                <p className="text-sm text-muted-foreground mt-1">باشگاه را انتخاب کن؛ سیستم مشتری‌ها را سگمنت می‌کند و کمپین آماده با متن پیشنهادی می‌دهد.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={clubId} onChange={e => setClubId(e.target.value)} className="h-10 min-w-48 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button variant="outline" onClick={fetchMarketingData} disabled={loading} className="gap-2"><RefreshCwIcon className={cn("w-4 h-4", loading && "animate-spin")} />تحلیل مجدد</Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 rounded-2xl border border-border bg-card p-1 w-fit">
          {[
            { key: "campaigns", label: "کمپین‌های مشتریان", icon: MegaphoneIcon },
            { key: "autofill", label: "پرکن هوشمند سانس", icon: BotIcon },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                tab === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {tab === "autofill" ? (
          <AutoFillPage embedded />
        ) : (
          <>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">مخاطب قابل هدف‌گیری</p><p className="text-2xl font-black text-foreground">{fmt(totalAudience)} نفر</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">کدهای تخفیف فعال</p><p className="text-2xl font-black text-primary">{fmt(codes.length)}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">بهترین فرصت الان</p><p className="text-lg font-black text-foreground truncate">{bestOpportunity?.label ?? "—"}</p></div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : segments.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">داده‌ای برای مارکتینگ پیدا نشد.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {segments.map(segment => <SegmentCard key={segment.key} segment={segment} onLaunch={setActiveSegment} />)}
          </div>
        )}
          </>
        )}
      </div>

      <CampaignModal clubId={clubId} segment={activeSegment} codes={codes} onClose={() => setActiveSegment(null)} />
    </div>
  );
}
