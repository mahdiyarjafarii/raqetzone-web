import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon, TrophyIcon, CalendarIcon, UsersIcon,
  CoinsIcon, StarIcon, XIcon, DownloadIcon,
  LockIcon, PlayIcon, FlagIcon, ChevronRightIcon,
  ChevronLeftIcon, CheckIcon, GiftIcon, ShieldCheckIcon,
  ZapIcon, Trash2Icon,
} from "lucide-react";

const ADMIN_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";

function buildUserImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${ADMIN_BASE}/uploads/user/${image}`;
}

function UserAvatar({ image, name, className, fallbackClassName }) {
  const src = buildUserImageUrl(image);
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling.style.display = "flex"; }}
        className={`object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div className={`flex items-center justify-center font-bold shrink-0 ${fallbackClassName ?? className}`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import PersianTimePicker from "@/components/PersianTimePicker";
import { cn } from "@/lib/utils";

const SPORT_ICONS = { padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸", "ping-pong":"🏓" };
const SPORTS = [
  { value:"padel",     label:"پدل",     icon:"🏓" },
  { value:"tennis",    label:"تنیس",     icon:"🎾" },
  { value:"squash",    label:"اسکواش",   icon:"🟡" },
  { value:"badminton", label:"بدمینتون", icon:"🏸" },
  { value:"ping-pong", label:"پینگ‌پنگ", icon:"🏓" },
];

const PHASE_CONFIG = {
  registration: { label:"ثبت‌نام",     badge:"bg-emerald-500/10 text-emerald-600 border-emerald-500/25", dot:"bg-emerald-500" },
  ongoing:      { label:"در حال اجرا", badge:"bg-blue-500/10    text-blue-600    border-blue-500/25",    dot:"bg-blue-500"    },
  completed:    { label:"پایان یافته", badge:"bg-zinc-500/10    text-zinc-500    border-zinc-500/25",    dot:"bg-zinc-400"    },
};

const WIZARD_STEPS = [
  { label:"اطلاعات پایه",   icon:<TrophyIcon className="w-3.5 h-3.5" />   },
  { label:"زمان‌بندی",      icon:<CalendarIcon className="w-3.5 h-3.5" />  },
  { label:"شرایط و جوایز", icon:<GiftIcon className="w-3.5 h-3.5" />      },
];

const emptyForm = {
  title:"", description:"", sportType:"padel",
  isFree: true, entryFee:0, maxParticipants:16,
  registrationDeadline:"", startDate:"", endDate:"",
  minLevel:1, prize:"", rules:"",
};

const inputClass =
  "rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors w-full resize-none";

const dateTimeFormatFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "short",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function toLocalDateTimeValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDatePart(value) {
  return value?.split("T")[0] ?? "";
}

function getTimePart(value) {
  return value?.split("T")[1] ?? "12:00";
}

function buildDateOptions(daysAhead = 730) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: daysAhead }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      value: toLocalDateTimeValue(date).split("T")[0],
      label: dateTimeFormatFa.format(date),
    };
  });
}

const persianDateOptions = buildDateOptions();

function PersianDateTimeInput({ value, onChange }) {
  const datePart = getDatePart(value);
  const timePart = getTimePart(value);

  function emit(nextDate, nextTime) {
    if (!nextDate) return;
    onChange(`${nextDate}T${nextTime}`);
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <select
        dir="rtl"
        value={datePart}
        onChange={(e) => emit(e.target.value, timePart)}
        className={inputClass}
      >
        <option value="">انتخاب تاریخ...</option>
        {persianDateOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <PersianTimePicker
        value={timePart}
        onChange={(nextTime) => emit(datePart, nextTime)}
      />
    </div>
  );
}

function WizardField({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-bold text-foreground/70 uppercase tracking-wide">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Wizard Step 1 ────────────────────────────────────────────────────────────

function WStep1({ form, setForm }) {
  return (
    <div className="space-y-4">
      <WizardField label="عنوان تورنومنت *">
        <input autoFocus className={inputClass} placeholder="مثال: مسابقات پدل بهاره"
          value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
      </WizardField>

      <WizardField label="توضیحات">
        <textarea rows={3} className={inputClass} placeholder="توضیح مختصری از تورنومنت..."
          value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
      </WizardField>

      <WizardField label="نوع ورزش *">
        <div className="grid grid-cols-5 gap-2">
          {SPORTS.map(s => (
            <button key={s.value} type="button"
              onClick={() => setForm(p => ({...p, sportType: s.value}))}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-center transition-all",
                form.sportType === s.value
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-border bg-muted/50 hover:border-violet-500/40"
              )}
            >
              <span className="text-2xl leading-none">{s.icon}</span>
              <span className={cn("text-[9px] font-bold", form.sportType === s.value ? "text-violet-600" : "text-muted-foreground")}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </WizardField>
    </div>
  );
}

// ─── Wizard Step 2 ────────────────────────────────────────────────────────────

function WStep2({ form, setForm }) {
  const deadline = form.registrationDeadline ? new Date(form.registrationDeadline) : null;
  const start    = form.startDate            ? new Date(form.startDate)            : null;
  const end      = form.endDate              ? new Date(form.endDate)              : null;
  const allSet   = !!(deadline && start && end);
  const valid    = allSet && deadline < start && start < end;

  return (
    <div className="space-y-4">
      <WizardField label="مهلت ثبت‌نام *" hint="باید قبل از شروع مسابقه باشد">
        <PersianDateTimeInput
          value={form.registrationDeadline}
          onChange={value => setForm(p => ({...p, registrationDeadline: value}))}
        />
      </WizardField>
      <WizardField label="تاریخ شروع *">
        <PersianDateTimeInput
          value={form.startDate}
          onChange={value => setForm(p => ({...p, startDate: value}))}
        />
      </WizardField>
      <WizardField label="تاریخ پایان *">
        <PersianDateTimeInput
          value={form.endDate}
          onChange={value => setForm(p => ({...p, endDate: value}))}
        />
      </WizardField>

      {allSet && (
        <div className={cn(
          "rounded-2xl p-4 border space-y-2",
          valid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
        )}>
          <p className={cn("text-xs font-bold flex items-center gap-1.5", valid ? "text-emerald-600" : "text-red-500")}>
            {valid ? <><CheckIcon className="w-3.5 h-3.5" /> ترتیب تاریخ‌ها صحیح</> : <>⚠️ ترتیب تاریخ‌ها اشتباه است</>}
          </p>
          <div className="flex items-center gap-1 text-[10px]">
            {[
              { color:"emerald", label:"ثبت‌نام", date:deadline },
              { color:"blue",    label:"شروع",    date:start    },
              { color:"violet",  label:"پایان",   date:end      },
            ].map(({color, label, date}, i) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
                  <span className={`font-bold text-${color}-600`}>{label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {date?.toLocaleDateString("fa-IR",{month:"short",day:"numeric"})}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-0.5 bg-border rounded mb-5" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wizard Step 3 ────────────────────────────────────────────────────────────

function WStep3({ form, setForm }) {
  return (
    <div className="space-y-4">
      <WizardField label="نوع ورودیه">
        <div className="grid grid-cols-2 gap-2">
          {[{v:true,l:"🎁 رایگان",a:"bg-emerald-600 border-emerald-600 text-white"},{v:false,l:"💰 پولی",a:"bg-violet-600 border-violet-600 text-white"}].map(({v,l,a}) => (
            <button key={String(v)} type="button"
              onClick={() => setForm(p => ({...p, isFree:v}))}
              className={cn("py-3 rounded-2xl text-sm font-bold border-2 transition-all",
                form.isFree === v ? a : "bg-muted border-border text-muted-foreground")}
            >{l}</button>
          ))}
        </div>
      </WizardField>

      {!form.isFree && (
        <WizardField label="مبلغ ورودیه (تومان) *">
          <input type="number" min={1000} step={1000} className={inputClass} placeholder="۵۰۰۰۰"
            value={form.entryFee} onChange={e => setForm(p => ({...p, entryFee: Number(e.target.value)}))} />
        </WizardField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <WizardField label="ظرفیت" hint={`${form.maxParticipants} نفر`}>
          <input type="range" min={4} max={128} step={4} className="w-full accent-violet-600"
            value={form.maxParticipants} onChange={e => setForm(p => ({...p, maxParticipants: Number(e.target.value)}))} />
        </WizardField>
        <WizardField label="حداقل سطح" hint={`سطح ${form.minLevel}`}>
          <input type="range" min={1} max={10} className="w-full accent-amber-500"
            value={form.minLevel} onChange={e => setForm(p => ({...p, minLevel: Number(e.target.value)}))} />
        </WizardField>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <UsersIcon className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="text-violet-600 font-bold">{form.maxParticipants} نفر</span>
        </div>
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <ZapIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-600 font-bold">سطح {form.minLevel}+</span>
        </div>
      </div>

      <WizardField label="جوایز مسابقه">
        <div className="relative">
          <GiftIcon className="absolute right-3 top-3 w-4 h-4 text-amber-500 pointer-events-none" />
          <textarea rows={3} className={cn(inputClass, "pr-9")} placeholder={"🥇 اول: ...\n🥈 دوم: ...\n🥉 سوم: ..."}
            value={form.prize} onChange={e => setForm(p => ({...p, prize: e.target.value}))} />
        </div>
      </WizardField>

      <WizardField label="قوانین و مقررات">
        <div className="relative">
          <ShieldCheckIcon className="absolute right-3 top-3 w-4 h-4 text-blue-500 pointer-events-none" />
          <textarea rows={3} className={cn(inputClass, "pr-9")} placeholder="قوانین مسابقه، نحوه امتیازدهی و..."
            value={form.rules} onChange={e => setForm(p => ({...p, rules: e.target.value}))} />
        </div>
      </WizardField>
    </div>
  );
}

// ─── Wizard Step Indicator ────────────────────────────────────────────────────

function WizardStepBar({ current }) {
  return (
    <div className="flex items-center gap-0 px-1 py-3">
      {WIZARD_STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                done   ? "bg-emerald-500 border-emerald-500 text-white" :
                active ? "bg-violet-600  border-violet-600  text-white shadow-md shadow-violet-500/30" :
                         "bg-muted       border-border       text-muted-foreground"
              )}>
                {done ? <CheckIcon className="w-4 h-4" /> : step.icon}
              </div>
              <span className={cn("text-[9px] font-bold whitespace-nowrap",
                active ? "text-violet-600" : done ? "text-emerald-500" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all",
                i < current ? "bg-emerald-500" : "bg-border")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Participants Modal ────────────────────────────────────────────────────────

function ParticipantsModal({ tournament, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/tournaments/${tournament.id}/participants`).then(({ ok, data }) => {
      if (ok) setParticipants(data.participants);
      setLoading(false);
    });
  }, [tournament.id]);

  function exportPDF() {
    const dateStr = new Date().toLocaleDateString("fa-IR");
    const rows = participants.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name ?? "ناشناس"}</td>
        <td dir="ltr">${p.phone ?? "-"}</td>
        <td>${p.level ?? "-"}</td>
        <td style="color:${p.paymentStatus==="paid"?"#16a34a":"#d97706"}">${p.paymentStatus === "paid" ? "✓ پرداخت شده" : "⏳ در انتظار"}</td>
        <td>${new Date(p.registeredAt).toLocaleDateString("fa-IR")}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8"/>
  <title>شرکت‌کنندگان — ${tournament.title}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Vazirmatn, Tahoma, sans-serif; padding: 32px; color: #111; direction: rtl; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; }
    .title  { font-size: 20px; font-weight: 900; color: #7c3aed; }
    .meta   { font-size: 12px; color: #666; margin-top: 4px; }
    .badge  { display: inline-block; font-size: 11px; padding: 2px 10px; border-radius: 999px; background: #ede9fe; color: #7c3aed; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #7c3aed; color: #fff; padding: 10px 12px; text-align: right; font-weight: 700; }
    td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9f7ff; }
    .footer { margin-top: 20px; font-size: 11px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">🏆 ${tournament.title}</div>
      <div class="meta">تاریخ خروجی: ${dateStr} &nbsp;·&nbsp; تعداد شرکت‌کنندگان: ${participants.length} نفر</div>
    </div>
    <span class="badge">${tournament.sportType}</span>
  </div>
  <table>
    <thead><tr><th>#</th><th>نام</th><th>تلفن</th><th>سطح</th><th>وضعیت</th><th>تاریخ ثبت‌نام</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">رکت‌زون — گزارش شرکت‌کنندگان تورنومنت</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  return (
    <Modal open onClose={onClose} title={`شرکت‌کنندگان — ${tournament.title}`} size="lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {loading ? "..." : `${participants.length} نفر`}
          </span>
          {!loading && participants.length > 0 && (
            <Button variant="outline" onClick={exportPDF} className="text-xs gap-1.5">
              <DownloadIcon className="w-3.5 h-3.5" /> خروجی PDF
            </Button>
          )}
        </div>

        <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-0.5">
          {loading ? (
            Array.from({length:4}).map((_,i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)
          ) : participants.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">هنوز کسی ثبت‌نام نکرده</div>
          ) : (
            participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/30">
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">#{i+1}</span>
                <UserAvatar
                  image={p.image}
                  name={p.name}
                  className="w-8 h-8 rounded-full text-white text-xs font-bold"
                  fallbackClassName="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-bold"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name ?? "ناشناس"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{p.phone ?? "-"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">سطح {p.level}</span>
                  <span className={cn(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                    p.paymentStatus === "paid"
                      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/25"
                      : "text-amber-600 bg-amber-500/10 border-amber-500/25"
                  )}>
                    {p.paymentStatus === "paid" ? "✓ پرداخت" : "در انتظار"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ tournament, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const { ok, data } = await apiClient.delete(`/tournaments/${tournament.id}`);
    setLoading(false);
    if (ok) {
      toast.success("تورنومنت حذف شد");
      onDeleted();
      onClose();
    } else {
      toast.error(data?.message ?? "خطا در حذف");
    }
  }

  return (
    <Modal open onClose={onClose} title="حذف تورنومنت" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          آیا از حذف تورنومنت <span className="font-bold text-foreground">«{tournament.title}»</span> مطمئن هستید؟
          این عمل قابل بازگشت نیست.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            انصراف
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60">
            {loading ? "در حال حذف..." : "بله، حذف شود"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tournament Card ───────────────────────────────────────────────────────────

function TournamentAdminCard({ tournament, onStatusChange, onViewParticipants, onDelete }) {
  const [actionLoading, setActionLoading] = useState(null);
  const phase = tournament.phase ?? "registration";
  const phaseCfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.registration;
  const isFree = tournament.entryFee === 0;
  const fillRatio = (tournament.registeredCount ?? 0) / tournament.maxParticipants;

  async function changeStatus(newStatus, label) {
    setActionLoading(newStatus);
    const { ok, data } = await apiClient.patch(`/tournaments/${tournament.id}`, { status: newStatus });
    setActionLoading(null);
    if (ok) { toast.success(`تورنومنت ${label} شد`); onStatusChange(); }
    else toast.error(data?.message ?? "خطا");
  }

  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-1 bg-gradient-to-r from-violet-600 to-indigo-500" />
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{SPORT_ICONS[tournament.sportType] ?? "🏅"}</span>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm leading-tight truncate">{tournament.title}</p>
              {tournament.club && <p className="text-[11px] text-muted-foreground">🏢 {tournament.club.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border", phaseCfg.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", phaseCfg.dot)} />
              {phaseCfg.label}
            </span>
            <button
              onClick={onDelete}
              className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
              title="حذف تورنومنت"
            >
              <Trash2Icon className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border text-muted-foreground">
            <CoinsIcon className="w-3 h-3" />{isFree ? "رایگان" : `${tournament.entryFee.toLocaleString("fa-IR")} ت`}
          </span>
          {tournament.minLevel > 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 border border-amber-500/25 text-amber-600">
              <StarIcon className="w-3 h-3" />سطح {tournament.minLevel}+
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border text-muted-foreground">
            <CalendarIcon className="w-3 h-3" />
            {new Date(tournament.startDate).toLocaleDateString("fa-IR",{month:"short",day:"numeric"})}
          </span>
        </div>

        {/* Capacity bar */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" />{tournament.registeredCount ?? 0} / {tournament.maxParticipants}</span>
            <span>{Math.round(fillRatio * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", fillRatio >= 1 ? "bg-amber-500" : fillRatio > 0.7 ? "bg-violet-500" : "bg-emerald-500")}
              style={{ width: `${Math.min(fillRatio * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onViewParticipants}
            className="flex-1 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            👥 شرکت‌کنندگان
          </button>

          {phase === "registration" && (
            <button
              onClick={() => changeStatus("ongoing", "شروع شد")}
              disabled={!!actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === "ongoing" ? "..." : <><PlayIcon className="w-3 h-3" />شروع</>}
            </button>
          )}

          {phase === "registration" && (
            <button
              onClick={() => changeStatus("closed", "بسته شد")}
              disabled={!!actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {actionLoading === "closed" ? "..." : <><LockIcon className="w-3 h-3" />بستن</>}
            </button>
          )}

          {phase === "ongoing" && (
            <button
              onClick={() => changeStatus("completed", "پایان یافت")}
              disabled={!!actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-600 text-white text-xs font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === "completed" ? "..." : <><FlagIcon className="w-3 h-3" />پایان</>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [participantsModal, setParticipantsModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState(null);

  const fetchTournaments = async () => {
    setLoading(true);
    const { ok, data } = await apiClient.get("/tournaments");
    if (ok) setTournaments(data.tournaments);
    setLoading(false);
  };
  useEffect(() => { fetchTournaments(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setWizardStep(0);
    setCreateOpen(true);
  }

  function validateWizardStep() {
    if (wizardStep === 0) {
      if (!form.title.trim()) { toast.error("عنوان الزامی است"); return false; }
    }
    if (wizardStep === 1) {
      if (!form.registrationDeadline || !form.startDate || !form.endDate) {
        toast.error("همه تاریخ‌ها الزامی هستند"); return false;
      }
      if (new Date(form.registrationDeadline) >= new Date(form.startDate)) {
        toast.error("مهلت ثبت‌نام باید قبل از شروع باشد"); return false;
      }
      if (new Date(form.startDate) >= new Date(form.endDate)) {
        toast.error("تاریخ شروع باید قبل از پایان باشد"); return false;
      }
    }
    return true;
  }

  function nextWizardStep() {
    if (!validateWizardStep()) return;
    if (wizardStep < WIZARD_STEPS.length - 1) setWizardStep(s => s + 1);
  }

  const handleCreate = async () => {
    setSaving(true);
    const { ok, data } = await apiClient.post("/tournaments", {
      ...form,
      entryFee: form.isFree ? 0 : Number(form.entryFee),
      maxParticipants: Number(form.maxParticipants),
      minLevel: Number(form.minLevel),
    });
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("تورنومنت ایجاد شد 🏆");
    setCreateOpen(false);
    fetchTournaments();
  };

  const PHASE_TABS = [
    { value: null,           label: `همه (${tournaments.length})` },
    { value: "registration", label: `ثبت‌نام (${tournaments.filter(t=>t.phase==="registration").length})` },
    { value: "ongoing",      label: `در حال اجرا (${tournaments.filter(t=>t.phase==="ongoing").length})` },
    { value: "completed",    label: `پایان یافته (${tournaments.filter(t=>t.phase==="completed").length})` },
  ];

  const filtered = phaseFilter ? tournaments.filter(t => t.phase === phaseFilter) : tournaments;
  const isLast = wizardStep === WIZARD_STEPS.length - 1;

  return (
    <div dir="rtl">
      <PageHeader
        title="مدیریت تورنومنت‌ها"
        description={`${tournaments.length} تورنومنت`}
        actions={<Button onClick={openCreate}><PlusIcon className="w-4 h-4" />تورنومنت جدید</Button>}
      />

      {/* Phase tabs */}
      <div className="px-6 pt-2 pb-0 border-b border-border">
        <div className="flex gap-1">
          {PHASE_TABS.map(tab => (
            <button
              key={String(tab.value)}
              onClick={() => setPhaseFilter(tab.value)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                phaseFilter === tab.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({length:6}).map((_,i) => <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <TrophyIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">تورنومنتی وجود ندارد</p>
          </div>
        ) : (
          filtered.map(t => (
            <TournamentAdminCard
              key={t.id}
              tournament={t}
              onStatusChange={fetchTournaments}
              onViewParticipants={() => setParticipantsModal(t)}
              onDelete={() => setDeleteModal(t)}
            />
          ))
        )}
      </div>

      {/* Participants modal */}
      {participantsModal && (
        <ParticipantsModal
          tournament={participantsModal}
          onClose={() => setParticipantsModal(null)}
        />
      )}

      {/* Delete modal */}
      {deleteModal && (
        <DeleteModal
          tournament={deleteModal}
          onClose={() => setDeleteModal(null)}
          onDeleted={fetchTournaments}
        />
      )}

      {/* Create modal — multi-step wizard */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={null}
        size="lg"
      >
        <div className="space-y-0">
          {/* Wizard header */}
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-black text-lg text-foreground">ایجاد تورنومنت</h2>
              <p className="text-xs text-muted-foreground">مرحله {wizardStep + 1} از {WIZARD_STEPS.length}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
              animate={{ width: `${((wizardStep + 1) / WIZARD_STEPS.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <WizardStepBar current={wizardStep} />

          {/* Step content */}
          <div className="max-h-[50vh] overflow-y-auto py-2 pl-1">
            <AnimatePresence mode="wait">
              {wizardStep === 0 && (
                <motion.div key="ws1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}}>
                  <WStep1 form={form} setForm={setForm} />
                </motion.div>
              )}
              {wizardStep === 1 && (
                <motion.div key="ws2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}}>
                  <WStep2 form={form} setForm={setForm} />
                </motion.div>
              )}
              {wizardStep === 2 && (
                <motion.div key="ws3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}}>
                  <WStep3 form={form} setForm={setForm} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Wizard nav */}
          <div className="flex gap-3 pt-4 border-t border-border mt-2">
            {wizardStep > 0 && (
              <button
                type="button"
                onClick={() => setWizardStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" /> قبلی
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? handleCreate : nextWizardStep}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-md shadow-violet-500/20 disabled:opacity-60 transition-all"
            >
              {saving ? "در حال ایجاد..." : isLast ? (
                <><TrophyIcon className="w-4 h-4" /> ایجاد تورنومنت</>
              ) : (
                <>بعدی <ChevronLeftIcon className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
