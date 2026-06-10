import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon, TrophyIcon, CalendarIcon, UsersIcon,
  CoinsIcon, StarIcon, XIcon, DownloadIcon,
  LockIcon, PlayIcon, FlagIcon, ChevronRightIcon,
  ChevronLeftIcon, CheckIcon, GiftIcon, ShieldCheckIcon,
  ZapIcon, Trash2Icon, ClockIcon, PencilIcon, Share2Icon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { cn, getUserFullName } from "@/lib/utils";

const ADMIN_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";
const PUBLIC_APP_BASE = import.meta.env.VITE_PUBLIC_APP_URL ?? import.meta.env.VITE_WEBSITE_URL ?? "http://localhost:5173";

function buildUserImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${ADMIN_BASE}/uploads/user/${image}`;
}

function ResultsModal({ tournament, onClose }) {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [manualDraft, setManualDraft] = useState({
    round: "1",
    playerAUserId: "",
    playerBUserId: "",
    score: "",
  });

  async function loadResults() {
    setLoading(true);
    const [resultsRes, participantsRes] = await Promise.all([
      apiClient.get(`/tournaments/${tournament.id}/results`),
      apiClient.get(`/tournaments/${tournament.id}/participants`),
    ]);

    if (resultsRes.ok) {
      setMatches(resultsRes.data.matches ?? []);
      setStandings(resultsRes.data.standings ?? []);
    } else {
      toast.error(resultsRes.data?.message ?? "خطا در دریافت نتایج");
    }

    if (participantsRes.ok) {
      setParticipants(participantsRes.data.participants ?? []);
    } else {
      toast.error(participantsRes.data?.message ?? "خطا در دریافت شرکت‌کنندگان");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadResults();
  }, [tournament.id]);

  async function submitResult(matchId) {
    const raw = scoreDrafts[matchId] ?? "";
    const sets = parseSetsInput(raw);
    if (!sets) {
      toast.error("فرمت نتیجه نامعتبر است. مثال: 6-4, 3-6, 10-8");
      return;
    }

    setSavingId(matchId);
    const { ok, data } = await apiClient.patch(`/tournaments/${tournament.id}/matches/${matchId}/result`, { sets });
    setSavingId(null);
    if (!ok) {
      toast.error(data?.message ?? "خطا در ثبت نتیجه");
      return;
    }

    toast.success("نتیجه ثبت شد");
    setMatches(data.matches ?? []);
    setStandings(data.standings ?? []);
    setScoreDrafts((prev) => ({ ...prev, [matchId]: "" }));
  }

  async function submitManualResult() {
    const sets = parseSetsInput(manualDraft.score);
    if (!manualDraft.playerAUserId || !manualDraft.playerBUserId) {
      toast.error("انتخاب هر دو بازیکن الزامی است");
      return;
    }
    if (manualDraft.playerAUserId === manualDraft.playerBUserId) {
      toast.error("بازیکنان باید متفاوت باشند");
      return;
    }
    if (!sets) {
      toast.error("فرمت نتیجه نامعتبر است. مثال: 6-4, 3-6, 10-8");
      return;
    }

    setSavingId("manual");
    const { ok, data } = await apiClient.patch(`/tournaments/${tournament.id}/matches/manual/result`, {
      round: Number(manualDraft.round || 1),
      playerAUserId: manualDraft.playerAUserId,
      playerBUserId: manualDraft.playerBUserId,
      sets,
    });
    setSavingId(null);

    if (!ok) {
      toast.error(data?.message ?? "خطا در ثبت نتیجه");
      return;
    }

    toast.success("نتیجه ثبت شد");
    setMatches(data.matches ?? []);
    setStandings(data.standings ?? []);
    setManualDraft((prev) => ({ ...prev, playerAUserId: "", playerBUserId: "", score: "" }));
  }

  return (
    <Modal open onClose={onClose} title={`مدیریت نتایج — ${tournament.title}`} size="lg">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">فرمت ثبت نتیجه ست‌ها</p>
          <p className="text-xs font-semibold text-foreground mt-1">مثال: <span dir="ltr">6-4, 3-6, 10-8</span></p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border p-3 space-y-2.5 bg-muted/20">
              <p className="text-xs font-bold text-foreground">ثبت دستی نتیجه بازی</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={manualDraft.round}
                  onChange={(e) => setManualDraft((prev) => ({ ...prev, round: e.target.value }))}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((roundNumber) => (
                    <option key={roundNumber} value={String(roundNumber)}>راند {roundNumber}</option>
                  ))}
                </select>

                <select
                  value={manualDraft.playerAUserId}
                  onChange={(e) => setManualDraft((prev) => ({ ...prev, playerAUserId: e.target.value }))}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="">بازیکن A</option>
                  {participants.map((p) => (
                    <option key={p.userId} value={p.userId}>{getUserFullName(p)}</option>
                  ))}
                </select>

                <select
                  value={manualDraft.playerBUserId}
                  onChange={(e) => setManualDraft((prev) => ({ ...prev, playerBUserId: e.target.value }))}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="">بازیکن B</option>
                  {participants.map((p) => (
                    <option key={p.userId} value={p.userId}>{getUserFullName(p)}</option>
                  ))}
                </select>

                <input
                  value={manualDraft.score}
                  onChange={(e) => setManualDraft((prev) => ({ ...prev, score: e.target.value }))}
                  placeholder="6-4, 3-6, 10-8"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                  dir="ltr"
                />
              </div>
              <button
                onClick={submitManualResult}
                disabled={savingId === "manual"}
                className="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-60"
              >
                {savingId === "manual" ? "..." : "ثبت نتیجه جدید"}
              </button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted text-xs font-bold text-foreground">جدول رده‌بندی</div>
              {standings.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">هنوز جدولی تشکیل نشده است.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                        <th className="px-2 py-2 text-right">#</th>
                        <th className="px-2 py-2 text-right">بازیکن</th>
                        <th className="px-2 py-2 text-right">امتیاز</th>
                        <th className="px-2 py-2 text-right">برد/باخت</th>
                        <th className="px-2 py-2 text-right">تفاضل ست</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row) => (
                        <tr key={row.userId} className="border-b border-border/60">
                          <td className="px-2 py-2 font-bold">{row.rank}</td>
                          <td className="px-2 py-2">{getUserFullName(row)}</td>
                          <td className="px-2 py-2 font-bold">{row.points}</td>
                          <td className="px-2 py-2">{row.wins}/{row.losses}</td>
                          <td className="px-2 py-2">{row.setDiff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="max-h-[42vh] overflow-y-auto space-y-2 pr-0.5">
              {matches.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  هنوز نتیجه‌ای ثبت نشده است.
                </div>
              ) : (
                matches.map((m) => {
                  const canSubmit = m.status === "scheduled" && m.playerAUserId && m.playerBUserId;
                  return (
                    <div key={m.id} className="rounded-xl border border-border p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">راند {m.round} — بازی {m.matchNumber}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          m.status === "finished" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25" :
                          m.status === "walkover" ? "bg-blue-500/10 text-blue-600 border-blue-500/25" :
                          "bg-muted text-muted-foreground border-border"
                        )}>
                          {m.status === "finished" ? "پایان یافته" : m.status === "walkover" ? "صعود خودکار" : "برنامه‌ریزی شده"}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {getUserFullName(m.playerA)} <span className="mx-1">vs</span> {getUserFullName(m.playerB)}
                      </div>

                      {m.status !== "scheduled" && (
                        <div className="text-xs text-foreground">
                          نتیجه: <span dir="ltr">{formatSetsSummary(m.scoreSets)}</span>
                        </div>
                      )}

                      {canSubmit && (
                        <div className="flex gap-2">
                          <input
                            value={scoreDrafts[m.id] ?? ""}
                            onChange={(e) => setScoreDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder="6-4, 3-6, 10-8"
                            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                            dir="ltr"
                          />
                          <button
                            onClick={() => submitResult(m.id)}
                            disabled={savingId === m.id}
                            className="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-60"
                          >
                            {savingId === m.id ? "..." : "ثبت"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
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
      {name?.[0]?.toUpperCase() ?? ""}
    </div>
  );
}

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
  isFree: true, entryFee:"", maxParticipants:16,
  registrationDeadline:"", startDate:"", endDate:"",
  minLevel:1, prize:"", rules:"",
};

const inputClass =
  "rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors w-full resize-none";

const TEHRAN_TIME_ZONE = "Asia/Tehran";

const dateTimeFormatFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "short",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDateFormatFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  month: "short",
  day: "numeric",
});

function formatDateKeyInTehran(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateStr) {
  const [year, month, day] = (dateStr ?? "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function addDaysToDateKey(dateStr, days) {
  const date = parseDateKey(dateStr);
  if (!date) return dateStr;
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKeyInTehran(date);
}

function formatSetsSummary(sets) {
  if (!Array.isArray(sets) || sets.length === 0) return "-";
  return sets.map((set) => `${set.a}-${set.b}`).join(" | ");
}

function parseSetsInput(raw) {
  if (!raw?.trim()) return null;
  const parts = raw.split(/[,|]/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const sets = [];
  for (const part of parts) {
    const [aRaw, bRaw] = part.split("-").map((x) => x?.trim());
    const a = Number(aRaw);
    const b = Number(bRaw);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0 || a === b) return null;
    sets.push({ a, b });
  }
  return sets.length ? sets : null;
}

function formatDateTimeValueInTehran(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getNowDateTimeValueInTehran() {
  return formatDateTimeValueInTehran(new Date());
}

function getDatePart(value) {
  return value?.split("T")[0] ?? "";
}

function getTimePart(value) {
  return value?.split("T")[1]?.slice(0, 5) ?? "12:00";
}

function formatShortDateLabel(value) {
  const dateKey = getDatePart(value);
  const date = parseDateKey(dateKey);
  if (!date) return "-";
  return shortDateFormatFa.format(date);
}

function toFormDateTime(value) {
  if (!value) return "";
  return formatDateTimeValueInTehran(value);
}

function tournamentToForm(tournament) {
  const entryFee = Number(tournament.entryFee ?? 0);
  return {
    title: tournament.title ?? "",
    description: tournament.description ?? "",
    sportType: tournament.sportType ?? "padel",
    isFree: entryFee === 0,
    entryFee: entryFee === 0 ? "" : String(entryFee),
    maxParticipants: tournament.maxParticipants ?? 16,
    registrationDeadline: toFormDateTime(tournament.registrationDeadline),
    startDate: toFormDateTime(tournament.startDate),
    endDate: toFormDateTime(tournament.endDate),
    minLevel: tournament.minLevel ?? 1,
    prize: tournament.prize ?? "",
    rules: tournament.rules ?? "",
  };
}

function buildDateOptions(daysAhead = 730) {
  const today = formatDateKeyInTehran(new Date());
  return Array.from({ length: daysAhead }, (_, index) => {
    const dateKey = addDaysToDateKey(today, index);
    const date = parseDateKey(dateKey);
    return {
      value: dateKey,
      label: dateTimeFormatFa.format(date),
    };
  });
}

const persianDateOptions = buildDateOptions();
const persianNumberFormat = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 });
const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function PersianDateTimeInput({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState("date");
  const datePart = getDatePart(value);
  const timePart = getTimePart(value);
  const selectedDateLabel = persianDateOptions.find((option) => option.value === datePart)?.label;
  const [hour = "12", minute = "00"] = timePart.split(":");

  function emit(nextDate, nextTime) {
    if (!nextDate) return;
    onChange(`${nextDate}T${nextTime}`);
  }

  function handleDateSelect(nextDate) {
    emit(nextDate, timePart);
    setPickerStep("time");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setPickerStep(datePart ? "time" : "date");
          setOpen(true);
        }}
        className={cn(
          "w-full rounded-2xl border bg-background px-4 py-3 text-right transition-all hover:border-violet-500/50 active:scale-[0.99]",
          datePart ? "border-violet-500/40 shadow-lg shadow-violet-500/10" : "border-input"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">تاریخ و ساعت</p>
            <p className={cn("truncate text-sm font-black", datePart ? "text-foreground" : "text-muted-foreground")}>
              {datePart ? `${selectedDateLabel}، ساعت ${persianNumberFormat.format(Number(hour))}:${persianNumberFormat.format(Number(minute))}` : "انتخاب تاریخ و ساعت"}
            </p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-muted-foreground rotate-180" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-[110] w-[min(92vw,520px)] max-h-[86vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
            >
              <div className="px-4 pt-4 pb-5 overflow-y-auto max-h-[86vh]">
                <div className="mb-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-9 w-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                  <div className="flex-1 text-right">
                    <h3 className="text-base font-black text-foreground">انتخاب زمان تورنومنت</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pickerStep === "date" ? "اول تاریخ را انتخاب کنید" : "حالا ساعت را مشخص کنید"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 rounded-2xl bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => setPickerStep("date")}
                    className={cn("py-2.5 rounded-xl text-xs font-bold transition-all", pickerStep === "date" ? "bg-background text-violet-600 shadow-sm" : "text-muted-foreground")}
                  >
                    ۱. تاریخ
                  </button>
                  <button
                    type="button"
                    disabled={!datePart}
                    onClick={() => setPickerStep("time")}
                    className={cn("py-2.5 rounded-xl text-xs font-bold transition-all", pickerStep === "time" ? "bg-background text-violet-600 shadow-sm" : "text-muted-foreground", !datePart && "opacity-40")}
                  >
                    ۲. ساعت
                  </button>
                </div>

                {pickerStep === "date" ? (
                  <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                    {persianDateOptions.slice(0, 90).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleDateSelect(option.value)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-2xl border-2 p-3 text-right transition-all",
                          datePart === option.value ? "border-violet-500 bg-violet-500/10" : "border-border bg-muted/30 hover:border-violet-500/40"
                        )}
                      >
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", datePart === option.value ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground")}>
                          {datePart === option.value ? <CheckIcon className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
                        </div>
                        <span className="text-sm font-bold text-foreground">{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-violet-500/20 bg-violet-500/5 p-4 text-center">
                      <p className="mb-1 text-xs text-muted-foreground">تاریخ انتخاب‌شده</p>
                      <p className="text-sm font-black text-foreground">{selectedDateLabel}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <ClockIcon className="h-3.5 w-3.5" />
                          ساعت
                        </div>
                        <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto rounded-2xl bg-muted/30 p-2">
                          {hourOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => emit(datePart, `${option}:${minute}`)}
                              className={cn("rounded-xl border py-2.5 text-sm font-black transition-all", hour === option ? "border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "border-border bg-background text-foreground hover:border-violet-500/40")}
                            >
                              {persianNumberFormat.format(Number(option))}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <ClockIcon className="h-3.5 w-3.5" />
                          دقیقه
                        </div>
                        <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto rounded-2xl bg-muted/30 p-2">
                          {minuteOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => emit(datePart, `${hour}:${option}`)}
                              className={cn("rounded-xl border py-2.5 text-sm font-black transition-all", minute === option ? "border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "border-border bg-background text-foreground hover:border-violet-500/40")}
                            >
                              {persianNumberFormat.format(Number(option))}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="h-12 w-full rounded-2xl bg-violet-600 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
                    >
                      تایید زمان
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
  const deadline = form.registrationDeadline || "";
  const start    = form.startDate || "";
  const end      = form.endDate || "";
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
                    {formatShortDateLabel(date)}
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
              onClick={() => setForm(p => ({...p, isFree:v, entryFee: v ? "" : p.entryFee}))}
              className={cn("py-3 rounded-2xl text-sm font-bold border-2 transition-all",
                form.isFree === v ? a : "bg-muted border-border text-muted-foreground")}
            >{l}</button>
          ))}
        </div>
      </WizardField>

      {!form.isFree && (
        <WizardField label="مبلغ ورودیه (تومان) *">
          <input type="number" min={1000} step={1000} className={inputClass} placeholder="۵۰۰۰۰"
            value={form.entryFee} onChange={e => setForm(p => ({...p, entryFee: e.target.value}))} />
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
    const dateStr = new Date().toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE });
    const formatPhone = (phone) => {
      const value = phone == null ? "" : String(phone).trim();
      return value || "-";
    };
    const rows = participants.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${getUserFullName(p)}</td>
        <td class="phone-col">${formatPhone(p.phone)}</td>
        <td>${p.level ?? "-"}</td>
        <td style="color:${p.paymentStatus==="paid"?"#16a34a":"#d97706"}">${p.paymentStatus === "paid" ? "✓ پرداخت شده" : "⏳ در انتظار"}</td>
        <td>${new Date(p.registeredAt).toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE })}</td>
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
    .phone-col { direction: ltr; text-align: right; unicode-bidi: plaintext; font-variant-numeric: tabular-nums; }
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
    <thead><tr><th>#</th><th>نام</th><th class="phone-col">شماره تماس</th><th>سطح</th><th>وضعیت</th><th>تاریخ ثبت‌نام</th></tr></thead>
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
              <div key={p.id} className="flex min-h-14 items-center gap-3 px-3 py-2 rounded-xl border border-border bg-muted/30">
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 leading-none">#{i+1}</span>
                <UserAvatar
                  image={p.image}
                  name={getUserFullName(p)}
                  className="w-8 h-8 rounded-full text-white text-xs font-bold"
                  fallbackClassName="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-bold"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate leading-none">{getUserFullName(p)}</p>
                </div>
                <div className="w-[170px] shrink-0 rounded-lg border border-border/70 bg-muted px-2 py-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-1">شماره تلفن</p>
                  <p className="text-sm text-foreground leading-none tabular-nums" dir="ltr">{p.phone ?? "-"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex h-7 items-center text-[11px] text-muted-foreground bg-muted px-1.5 rounded">سطح {p.level}</span>
                  <span className={cn(
                    "inline-flex h-7 items-center text-[11px] font-semibold px-2 rounded-full border",
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

function TournamentAdminCard({ tournament, onStatusChange, onViewParticipants, onManageResults, onEdit, onDelete }) {
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

  async function copyInviteLink() {
    const url = `${PUBLIC_APP_BASE.replace(/\/$/, "")}/tournament/invite/${tournament.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک دعوت کپی شد");
    } catch {
      toast.error("خطا در کپی لینک");
    }
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
              onClick={onEdit}
              className="w-6 h-6 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 flex items-center justify-center transition-colors"
              title="ویرایش تورنومنت"
            >
              <PencilIcon className="w-3.5 h-3.5 text-violet-500" />
            </button>
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
            {new Date(tournament.startDate).toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE, month:"short", day:"numeric" })}
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
        <div className={cn("grid gap-2 pt-1", phase === "registration" ? "grid-cols-2" : "grid-cols-3")}>
          <button
            onClick={onViewParticipants}
            className="py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            👥 شرکت‌کنندگان
          </button>
          {phase !== "registration" && (
            <button
              onClick={onManageResults}
              className="py-1.5 rounded-xl border border-blue-500/25 bg-blue-500/10 text-xs font-semibold text-blue-600 hover:bg-blue-500/15 transition-colors"
            >
              🏁 نتایج
            </button>
          )}
          <button
            onClick={copyInviteLink}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/15 transition-colors"
          >
            <Share2Icon className="w-3.5 h-3.5" />
            لینک دعوت
          </button>
        </div>

        <div className="flex gap-2">
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
  const [editingTournament, setEditingTournament] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [participantsModal, setParticipantsModal] = useState(null);
  const [resultsModal, setResultsModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState(null);

  const fetchTournaments = async () => {
    setLoading(true);
    const clubsRes = await apiClient.get("/club-panel/clubs");
    if (!clubsRes.ok) {
      setTournaments([]);
      setLoading(false);
      toast.error(clubsRes.data?.message ?? "خطا در دریافت باشگاه‌ها");
      return;
    }

    const clubIds = (clubsRes.data?.clubs ?? []).map((club) => club.id).filter(Boolean);
    if (clubIds.length === 0) {
      setTournaments([]);
      setLoading(false);
      return;
    }

    const tournamentResponses = await Promise.all(clubIds.map((clubId) => apiClient.get(`/clubs/${clubId}/tournaments`)));
    const hasError = tournamentResponses.some((res) => !res.ok);

    if (hasError) {
      setTournaments([]);
      toast.error("خطا در بارگذاری تورنومنت‌ها");
      setLoading(false);
      return;
    }

    const merged = tournamentResponses.flatMap((res) => res.data?.tournaments ?? []);
    setTournaments(merged);
    setLoading(false);
  };
  useEffect(() => { fetchTournaments(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingTournament(null);
    setWizardStep(0);
    setCreateOpen(true);
  }

  function openEdit(tournament) {
    setForm(tournamentToForm(tournament));
    setEditingTournament(tournament);
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
      const nowTehran = getNowDateTimeValueInTehran();
      if (form.registrationDeadline < nowTehran) {
        toast.error("مهلت ثبت‌نام نباید قبل از زمان فعلی باشد"); return false;
      }
      if (form.registrationDeadline >= form.startDate) {
        toast.error("مهلت ثبت‌نام باید قبل از شروع باشد"); return false;
      }
      if (form.startDate >= form.endDate) {
        toast.error("تاریخ شروع باید قبل از پایان باشد"); return false;
      }
    }
    return true;
  }

  function nextWizardStep() {
    if (!validateWizardStep()) return;
    if (wizardStep < WIZARD_STEPS.length - 1) setWizardStep(s => s + 1);
  }

  const handleSubmit = async () => {
    setSaving(true);
    const payload = {
      ...form,
      entryFee: form.isFree ? 0 : Number(form.entryFee),
      maxParticipants: Number(form.maxParticipants),
      minLevel: Number(form.minLevel),
    };
    const { ok, data } = editingTournament
      ? await apiClient.patch(`/tournaments/${editingTournament.id}`, payload)
      : await apiClient.post("/tournaments", payload);
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success(editingTournament ? "تورنومنت ویرایش شد" : "تورنومنت ایجاد شد 🏆");
    setCreateOpen(false);
    setEditingTournament(null);
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
              onManageResults={() => setResultsModal(t)}
              onEdit={() => openEdit(t)}
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

      {/* Results modal */}
      {resultsModal && (
        <ResultsModal
          tournament={resultsModal}
          onClose={() => setResultsModal(null)}
        />
      )}

      {/* Create modal — multi-step wizard */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditingTournament(null);
        }}
        title={null}
        size="lg"
      >
        <div className="space-y-0">
          {/* Wizard header */}
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-black text-lg text-foreground">{editingTournament ? "ویرایش تورنومنت" : "ایجاد تورنومنت"}</h2>
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
              onClick={isLast ? handleSubmit : nextWizardStep}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-md shadow-violet-500/20 disabled:opacity-60 transition-all"
            >
              {saving ? (editingTournament ? "در حال ذخیره..." : "در حال ایجاد...") : isLast ? (
                <><TrophyIcon className="w-4 h-4" /> {editingTournament ? "ذخیره تغییرات" : "ایجاد تورنومنت"}</>
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
