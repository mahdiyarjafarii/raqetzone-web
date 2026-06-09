import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsersIcon, SearchIcon, PhoneIcon, CalendarCheckIcon,
  BanknoteIcon, TrophyIcon, UserCircle2Icon, SendIcon,
  TicketIcon, MessageSquareIcon, XIcon, CheckCircle2Icon,
  SparklesIcon, RefreshCwIcon, ChevronDownIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { fmt, cn, getUserFullName } from "@/lib/utils";

const TEHRAN_TIME_ZONE = "Asia/Tehran";
const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";

function buildUserImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads/")) return `${API_BASE}${image}`;
  if (image.startsWith("uploads/")) return `${API_BASE}/${image}`;
  if (image.startsWith("user/")) return `${API_BASE}/uploads/${image}`;
  return `${API_BASE}/uploads/user/${image}`;
}

// ─── Message templates ────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    label: "تخفیف ویژه",
    icon: "🎁",
    text: "سلام {name} عزیز 👋\nما یه کد تخفیف {discount} ویژه برات آماده کردیم:\n🎟 کد: {code}\nبرای رزرو زمین همین الان استفاده کن!\n— رکت‌زون 🎾",
  },
  {
    label: "بازگشت مشتری",
    icon: "🔄",
    text: "سلام {name} عزیز!\nدلمون برات تنگ شده 😄\nبا کد تخفیف {discount} زیر برگرد و زمین رزرو کن:\n🎟 {code}\n— باشگاه رکت‌زون",
  },
  {
    label: "مناسبت خاص",
    icon: "🎉",
    text: "سلام {name}!\nبه مناسبت یه اتفاق خاص، یه هدیه برات داریم 🎁\nکد تخفیف {discount}:\n{code}\nمنتظرتیم — رکت‌زون 🏓",
  },
  {
    label: "آزاد",
    icon: "✏️",
    text: "",
  },
];

const FILTER_OPTIONS = [
  { value: "all",        label: "همه مشتریان",           desc: "کسانی که رزرو یا تورنومنت داشتند" },
  { value: "booked",     label: "فقط رزروکنندگان",       desc: "کاربرانی که حداقل یک رزرو داشتند" },
  { value: "tournament", label: "فقط شرکت‌کننده تورنومنت", desc: "کاربرانی که تورنومنت ثبت‌نام کردند" },
];

function hasDiscountPlaceholder(text) {
  return /\{code\}|\{discount\}/.test(text);
}

// ─── SMS Campaign Modal ───────────────────────────────────────────────────────

function SmsCampaignModal({ open, onClose, clubs, customerCount }) {
  const [step, setStep] = useState("compose"); // compose | confirm | result
  const [clubId, setClubId] = useState("");
  const [discountCodes, setDiscountCodes] = useState([]);
  const [discountCodeId, setDiscountCodeId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [message, setMessage] = useState(TEMPLATES[0].text);
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const textareaRef = useRef(null);

  // Load discount codes when club selected
  useEffect(() => {
    if (!clubId) { setDiscountCodes([]); setDiscountCodeId(""); return; }
    apiClient.get(`/club-panel/clubs/${clubId}/discount-codes`).then(({ ok, data }) => {
      if (ok) setDiscountCodes(data.filter(c => c.isActive));
    });
  }, [clubId]);

  // When discount code changes, fill {code} and {discount} in preview
  const selectedCode = discountCodes.find(c => c.id === discountCodeId);

  const preview = message
    .replace(/\{name\}/g, "علی عزیزی")
    .replace(/\{code\}/g, selectedCode?.code ?? "بدون کد")
    .replace(/\{discount\}/g,
      selectedCode
        ? selectedCode.discountType === "percent"
          ? `${selectedCode.discountValue}٪`
          : `${selectedCode.discountValue.toLocaleString()} تومان`
        : "بدون تخفیف"
    );

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 70) || 1;

  const insertPlaceholder = (ph) => {
    const el = textareaRef.current;
    if (!el) { setMessage(m => m + ph); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = message.slice(0, start) + ph + message.slice(end);
    setMessage(next);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + ph.length;
      el.focus();
    }, 0);
  };

  const handleTemplateSelect = (i) => {
    setSelectedTemplate(i);
    if (TEMPLATES[i].text) setMessage(TEMPLATES[i].text);
  };

  const handleSend = async () => {
    if (!clubId) return toast.error("باشگاه را انتخاب کنید");
    if (!message.trim()) return toast.error("متن پیام خالی است");
    if (!discountCodeId && hasDiscountPlaceholder(message)) {
      return toast.error("برای این متن باید کد تخفیف انتخاب کنید یا بخش کد تخفیف را از متن حذف کنید");
    }
    setSending(true);
    const { ok, data } = await apiClient.post(`/club-panel/clubs/${clubId}/sms-campaign`, {
      discountCodeId: discountCodeId || undefined,
      message,
      recipientFilter,
    });
    setSending(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ارسال");
    setResult(data);
    setStep("result");
  };

  const handleClose = () => {
    setStep("compose");
    setClubId("");
    setDiscountCodeId("");
    setMessage(TEMPLATES[0].text);
    setSelectedTemplate(0);
    setRecipientFilter("all");
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="ارسال SMS بازاریابی" size="lg">
      <AnimatePresence mode="wait">

        {/* ── Step: Result ── */}
        {step === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-6 gap-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center"
            >
              <CheckCircle2Icon className="w-10 h-10 text-emerald-500" />
            </motion.div>

            <div>
              <h3 className="text-xl font-black text-foreground mb-1">کمپین ارسال شد! 🎉</h3>
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: "کل گیرندگان", value: result.total, color: "text-foreground", bg: "bg-muted" },
                { label: "موفق", value: result.sent, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                { label: "ناموفق", value: result.failed, color: "text-red-500", bg: "bg-red-500/10" },
              ].map(s => (
                <div key={s.label} className={cn("rounded-2xl p-4 text-center", s.bg)}>
                  <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <Button onClick={handleClose} className="w-full">بستن</Button>
          </motion.div>
        )}

        {/* ── Step: Compose ── */}
        {step === "compose" && (
          <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

            {/* Club selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">باشگاه *</label>
              <select
                value={clubId}
                onChange={e => setClubId(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="">انتخاب باشگاه...</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Recipient filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">ارسال به</label>
              <div className="grid grid-cols-3 gap-2">
                {FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecipientFilter(opt.value)}
                    className={cn(
                      "flex flex-col items-start px-3 py-2.5 rounded-xl border text-right transition-all",
                      recipientFilter === opt.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] mt-0.5 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Discount code selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <TicketIcon className="w-3.5 h-3.5" />
                کد تخفیف (اختیاری)
              </label>
              <select
                value={discountCodeId}
                onChange={e => setDiscountCodeId(e.target.value)}
                disabled={!clubId || discountCodes.length === 0}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
              >
                <option value="">بدون کد تخفیف</option>
                {discountCodes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.discountType === "percent" ? `${c.discountValue}٪` : `${fmt(c.discountValue)} ت`}
                    {c.expiresAt ? ` (تا ${new Date(c.expiresAt).toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE })})` : ""}
                  </option>
                ))}
              </select>
              {clubId && discountCodes.length === 0 && (
                <p className="text-[10px] text-muted-foreground">این باشگاه کد تخفیف فعالی ندارد</p>
              )}
            </div>

            {/* Templates */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5" />
                قالب پیام
              </label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTemplateSelect(i)}
                    className={cn(
                      "flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                      selectedTemplate === i
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message editor */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MessageSquareIcon className="w-3.5 h-3.5" />
                  متن پیام
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{charCount} حرف / {smsCount} SMS</span>
                </div>
              </div>

              {/* Placeholder chips */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { ph: "{name}", label: "نام کاربر" },
                  { ph: "{code}", label: "کد تخفیف" },
                  { ph: "{discount}", label: "مقدار تخفیف" },
                ].map(p => (
                  <button
                    key={p.ph}
                    type="button"
                    onClick={() => insertPlaceholder(p.ph)}
                    className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-mono font-bold hover:bg-primary/20 transition-colors"
                  >
                    + {p.ph}
                    <span className="font-sans font-normal text-primary/70 mr-1">({p.label})</span>
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                placeholder="متن پیام خود را بنویسید..."
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Preview */}
            {message.trim() && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  پیش‌نمایش برای «علی عزیزی»
                </p>
                <div className="bg-card rounded-xl p-3 shadow-sm">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{preview}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={sending || !clubId || !message.trim()}
              className="w-full h-12 gap-2 font-bold text-sm"
            >
              {sending
                ? <><RefreshCwIcon className="w-4 h-4 animate-spin" />در حال ارسال...</>
                : <><SendIcon className="w-4 h-4" />ارسال به {FILTER_OPTIONS.find(f => f.value === recipientFilter)?.label}</>
              }
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </Modal>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ customer }) {
  const src = buildUserImageUrl(customer.image);
  const fullName = getUserFullName(customer);
  const initials = (fullName || customer.phone || "?")[0]?.toUpperCase() ?? "?";
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextSibling.style.display = "inline";
          }}
        />
      ) : null}
      <span className="text-primary font-bold text-sm" style={{ display: src ? "none" : "inline" }}>{initials}</span>
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", className)}>
      {children}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [clubs, setClubs]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [campaignOpen, setCampaignOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [customersRes, clubsRes] = await Promise.all([
        apiClient.get("/club-panel/customers"),
        apiClient.get("/club-panel/clubs"),
      ]);
      if (customersRes.ok) setCustomers(customersRes.data.customers);
      else toast.error("خطا در بارگذاری مشتریان");
      if (clubsRes.ok) setClubs(clubsRes.data.clubs ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = customers.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fullName = getUserFullName(c);
    return (
      fullName.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  return (
    <div dir="rtl">
      <PageHeader
        title="مشتریان باشگاه"
        description={`${customers.length} کاربر که رزرو یا ثبت‌نام تورنومنت داشته‌اند`}
        actions={
          <Button
            onClick={() => setCampaignOpen(true)}
            className="gap-2 shadow-sm bg-gradient-to-l from-violet-600 to-primary hover:opacity-90"
          >
            <SendIcon className="w-4 h-4" />
            ارسال SMS تخفیف
          </Button>
        }
      />

      <div className="p-6 space-y-5">

        {/* search */}
        <div className="relative max-w-sm">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو با نام یا شماره..."
            className="w-full h-9 rounded-xl border border-input bg-background pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* summary cards */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "کل مشتریان",
                value: customers.length,
                icon: UsersIcon,
                color: "text-violet-500",
                bg: "bg-violet-500/10",
              },
              {
                label: "کل رزروها",
                value: customers.reduce((s, c) => s + c.bookCount, 0),
                icon: CalendarCheckIcon,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                label: "درآمد کل (تأیید شده)",
                value: `${fmt(customers.reduce((s, c) => s + c.totalSpent, 0))} ت`,
                icon: BanknoteIcon,
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                label: "شرکت‌کننده تورنومنت",
                value: customers.filter(c => c.fromTournament).length,
                icon: TrophyIcon,
                color: "text-amber-500",
                bg: "bg-amber-500/10",
              },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3"
              >
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
                  <c.icon className={cn("w-4 h-4", c.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-lg font-black text-foreground leading-tight">{c.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <UserCircle2Icon className="w-14 h-14 text-muted-foreground/25 mb-4" />
            <h3 className="font-bold text-foreground mb-1">
              {search ? "نتیجه‌ای یافت نشد" : "هنوز مشتری‌ای ندارید"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search
                ? "عبارت جستجو را تغییر دهید"
                : "به محض اینکه کاربری رزرو یا ثبت‌نام تورنومنت انجام دهد اینجا نمایش داده می‌شود"
              }
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>کاربر</span>
              <span>رزروها</span>
              <span>پرداخت کل</span>
              <span>آخرین مراجعه</span>
              <span>برچسب</span>
            </div>

            <div className="divide-y divide-border">
              {filtered.map((c, i) => {
                const fullName = getUserFullName(c);
                return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar customer={c} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {fullName}
                      </p>
                      {c.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                          <PhoneIcon className="w-3 h-3" />
                          {c.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:block">
                    <span className="text-xs text-muted-foreground sm:hidden">رزروها: </span>
                    <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                      <CalendarCheckIcon className="w-3.5 h-3.5 text-blue-500" />
                      {c.bookCount}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:block">
                    <span className="text-xs text-muted-foreground sm:hidden">پرداخت: </span>
                    <p className="text-sm font-bold text-primary">{fmt(c.totalSpent)} ت</p>
                  </div>

                  <div className="flex items-center gap-1.5 sm:block">
                    <span className="text-xs text-muted-foreground sm:hidden">آخرین مراجعه: </span>
                    <p className="text-xs text-muted-foreground">
                      {c.lastVisit
                        ? new Date(c.lastVisit).toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE })
                        : "—"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {c.bookCount > 0 && (
                      <Badge className="bg-blue-500/10 text-blue-600">
                        <CalendarCheckIcon className="w-2.5 h-2.5" />
                        رزرو
                      </Badge>
                    )}
                    {c.fromTournament && (
                      <Badge className="bg-amber-500/10 text-amber-600">
                        <TrophyIcon className="w-2.5 h-2.5" />
                        تورنومنت
                      </Badge>
                    )}
                  </div>
                </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <SmsCampaignModal
        open={campaignOpen}
        onClose={() => setCampaignOpen(false)}
        clubs={clubs}
        customerCount={customers.length}
      />
    </div>
  );
}
