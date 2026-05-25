import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon, TrophyIcon, CalendarIcon, UsersIcon,
  CoinsIcon, StarIcon, XIcon, DownloadIcon,
  LockIcon, PlayIcon, FlagIcon, ChevronDownIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const SPORT_ICONS = { padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸", "ping-pong":"🏓" };
const SPORTS = ["padel","tennis","squash","badminton","ping-pong"];

const PHASE_CONFIG = {
  registration: { label:"ثبت‌نام",     badge:"bg-emerald-500/10 text-emerald-600 border-emerald-500/25", dot:"bg-emerald-500" },
  ongoing:      { label:"در حال اجرا", badge:"bg-blue-500/10    text-blue-600    border-blue-500/25",    dot:"bg-blue-500"    },
  completed:    { label:"پایان یافته", badge:"bg-zinc-500/10    text-zinc-500    border-zinc-500/25",    dot:"bg-zinc-400"    },
};

const emptyForm = {
  title:"", description:"", sportType:"padel",
  isFree: true, entryFee:0, maxParticipants:16,
  registrationDeadline:"", startDate:"", endDate:"",
  minLevel:1, prize:"", rules:"",
};

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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {p.name?.[0]?.toUpperCase() ?? "?"}
                </div>
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
          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0", phaseCfg.badge)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", phaseCfg.dot)} />
            {phaseCfg.label}
          </span>
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
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [participantsModal, setParticipantsModal] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState(null);

  const fetchTournaments = async () => {
    setLoading(true);
    const { ok, data } = await apiClient.get("/tournaments");
    if (ok) setTournaments(data.tournaments);
    setLoading(false);
  };
  useEffect(() => { fetchTournaments(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.registrationDeadline || !form.startDate || !form.endDate) {
      return toast.error("فیلدهای الزامی را پر کنید");
    }
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
    setCreateOpen(false); setForm(emptyForm);
    fetchTournaments();
  };

  const PHASE_TABS = [
    { value: null,           label: `همه (${tournaments.length})` },
    { value: "registration", label: `ثبت‌نام (${tournaments.filter(t=>t.phase==="registration").length})` },
    { value: "ongoing",      label: `در حال اجرا (${tournaments.filter(t=>t.phase==="ongoing").length})` },
    { value: "completed",    label: `پایان یافته (${tournaments.filter(t=>t.phase==="completed").length})` },
  ];

  const filtered = phaseFilter ? tournaments.filter(t => t.phase === phaseFilter) : tournaments;

  return (
    <div dir="rtl">
      <PageHeader
        title="مدیریت تورنومنت‌ها"
        description={`${tournaments.length} تورنومنت`}
        actions={<Button onClick={() => setCreateOpen(true)}><PlusIcon className="w-4 h-4" />تورنومنت جدید</Button>}
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
              onDelete={() => {}}
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

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="ایجاد تورنومنت جدید" size="lg">
        <form onSubmit={handleCreate} className="space-y-3 max-h-[65vh] overflow-y-auto pl-1">
          <Input label="عنوان *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">توضیحات</label>
            <textarea rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>

          {/* Sport */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">نوع ورزش</label>
            <div className="flex flex-wrap gap-1.5">
              {SPORTS.map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(p => ({...p, sportType:s}))}
                  className={cn("px-3 py-1 rounded-xl text-xs font-medium border transition-all",
                    form.sportType === s ? "bg-violet-600 text-white border-violet-600" : "bg-muted border-border text-muted-foreground")}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Free/Paid */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">نوع ورودیه</label>
            <div className="flex gap-2">
              {[{v:true,l:"🎁 رایگان"},{v:false,l:"💰 پولی"}].map(({v,l}) => (
                <button key={String(v)} type="button"
                  onClick={() => setForm(p => ({...p, isFree:v}))}
                  className={cn("flex-1 py-2 rounded-xl text-sm font-semibold border transition-all",
                    form.isFree === v ? (v ? "bg-emerald-600 text-white border-emerald-600" : "bg-violet-600 text-white border-violet-600") : "bg-muted border-border text-muted-foreground")}
                >{l}</button>
              ))}
            </div>
          </div>
          {!form.isFree && (
            <Input label="مبلغ ورودیه (تومان) *" type="number" min={1000} value={form.entryFee} onChange={e=>setForm(p=>({...p,entryFee:e.target.value}))} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="حداکثر شرکت‌کننده" type="number" min={2} value={form.maxParticipants} onChange={e=>setForm(p=>({...p,maxParticipants:e.target.value}))} />
            <Input label="حداقل سطح (۱-۱۰)" type="number" min={1} max={10} value={form.minLevel} onChange={e=>setForm(p=>({...p,minLevel:e.target.value}))} />
          </div>

          <Input label="مهلت ثبت‌نام *" type="datetime-local" value={form.registrationDeadline} onChange={e=>setForm(p=>({...p,registrationDeadline:e.target.value}))} required />
          <Input label="تاریخ شروع *" type="datetime-local" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} required />
          <Input label="تاریخ پایان *" type="datetime-local" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} required />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">جوایز</label>
            <textarea rows={2} placeholder={"🥇 اول: ...\n🥈 دوم: ..."} value={form.prize} onChange={e=>setForm(p=>({...p,prize:e.target.value}))}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">قوانین</label>
            <textarea rows={3} value={form.rules} onChange={e=>setForm(p=>({...p,rules:e.target.value}))}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "در حال ایجاد..." : "ایجاد تورنومنت 🏆"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
