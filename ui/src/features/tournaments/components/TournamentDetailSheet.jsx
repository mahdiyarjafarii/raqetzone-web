import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import toast from "react-hot-toast";
import {
  XIcon, CalendarIcon, UsersIcon, CoinsIcon, StarIcon,
  TrophyIcon, ClockIcon, ShieldCheckIcon, GiftIcon,
  CheckCircleIcon, ChevronDownIcon, CheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { currentUserAtom } from "@/config/state";
import UserAvatar from "@/components/ui/UserAvatar";
import UserProfileSheet from "@/components/ui/UserProfileSheet";
import { selectedTournamentAtom, tournamentDetailOpenAtom, tournamentsAtom } from "../store/tournamentStore";
import { tournamentService } from "../services/tournamentService";

const SPORT_ICONS = {
  padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸", "ping-pong":"🏓",
};

const PHASE_CONFIG = {
  registration: { label:"ثبت‌نام باز",  dot:"bg-emerald-500", badge:"text-emerald-600 bg-emerald-500/10 border-emerald-500/25" },
  ongoing:      { label:"در حال اجرا", dot:"bg-blue-500",    badge:"text-blue-600   bg-blue-500/10   border-blue-500/25"    },
  completed:    { label:"پایان یافته", dot:"bg-zinc-400",    badge:"text-zinc-500   bg-zinc-500/10   border-zinc-500/25"    },
};

const PHASES = ["registration", "ongoing", "completed"];
const PHASE_LABELS = { registration:"ثبت‌نام", ongoing:"اجرا", completed:"پایان" };

// ─── Phase stepper ─────────────────────────────────────────────────────────────

function PhaseSteps({ phase }) {
  const currentIdx = PHASES.indexOf(phase);
  return (
    <div className="flex items-center gap-0">
      {PHASES.map((p, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={p}>
            <div className="flex flex-col items-center gap-0.5">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all shadow-sm",
                done   ? "bg-emerald-500 border-emerald-500 text-white" :
                active ? "bg-blue-500   border-blue-500   text-white" :
                         "bg-white/85   border-white/70   text-slate-600"
              )}>
                {done ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={cn(
                "text-[9px] font-semibold leading-none",
                active ? "text-white" : done ? "text-emerald-300" : "text-white/70"
              )}>{PHASE_LABELS[p]}</span>
            </div>
            {i < PHASES.length - 1 && (
              <div className={cn("flex-1 h-0.5 mb-3 mx-1 rounded-full", i < currentIdx ? "bg-emerald-400" : "bg-white/35")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(deadline) {
  const [parts, setParts] = useState({ d:0, h:0, m:0, s:0, expired:false });
  useEffect(() => {
    function tick() {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) { setParts({ d:0, h:0, m:0, s:0, expired:true }); return; }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return parts;
}

function CountdownBlock({ deadline }) {
  const { d, h, m, s, expired } = useCountdown(deadline);
  if (expired) return (
    <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20">
      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
      <span className="text-red-500 text-xs font-semibold">مهلت ثبت‌نام به پایان رسید</span>
    </div>
  );
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
        <ClockIcon className="w-3 h-3" /> مانده تا پایان ثبت‌نام
      </p>
      <div className="flex gap-2">
        {[{v:d,l:"روز"},{v:h,l:"ساعت"},{v:m,l:"دقیقه"},{v:s,l:"ثانیه"}].map(({v,l}) => (
          <div key={l} className="flex-1 flex flex-col items-center py-2.5 rounded-2xl bg-gradient-to-b from-violet-600/20 to-indigo-600/10 border border-violet-500/20">
            <span className="text-xl font-black text-foreground tabular-nums leading-none">{String(v).padStart(2,"0")}</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Participants list ──────────────────────────────────────────────────────────

function ParticipantsList({ participants, max, currentUserId }) {
  const [showAll, setShowAll] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const visible = showAll ? participants : participants.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UsersIcon className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-bold text-foreground">شرکت‌کنندگان</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {participants.length}/{max}
        </span>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-5 rounded-2xl bg-muted/40 border border-dashed border-border">
          <UsersIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground">هنوز کسی ثبت‌نام نکرده</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">اولین نفر باش!</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <AnimatePresence>
              {visible.map((p, i) => {
                const isMe = p.userId === currentUserId;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity:0, x:-8 }}
                    animate={{ opacity:1, x:0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => !isMe && setViewingUser(p)}
                    className={cn(
                      "flex items-center gap-3 py-2 px-3 rounded-xl bg-muted/40 border border-border/60 transition-colors",
                      !isMe && "cursor-pointer hover:bg-muted/70 active:scale-[0.99]"
                    )}
                  >
                    <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">#{i+1}</span>
                    <UserAvatar
                      image={p.image}
                      name={p.name}
                      className="w-8 h-8 rounded-full text-xs text-white font-black"
                      fallbackClassName="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-black"
                    />
                    <p className="flex-1 text-sm font-medium text-foreground truncate">{p.name ?? "کاربر"}</p>
                    {isMe ? (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold shrink-0">شما</span>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                        p.paymentStatus === "paid"
                          ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/25"
                          : "text-amber-600 bg-amber-500/10 border-amber-500/25"
                      )}>
                        {p.paymentStatus === "paid" ? "✓ پرداخت" : "⏳ در انتظار"}
                      </span>
                    )}
                  </motion.div>
                );
              })}
              {viewingUser && (
                <UserProfileSheet
                  userId={viewingUser.userId}
                  name={viewingUser.name}
                  image={viewingUser.image}
                  onClose={() => setViewingUser(null)}
                />
              )}
            </AnimatePresence>
          </div>
          {participants.length > 6 && (
            <button
              onClick={() => setShowAll(p => !p)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronDownIcon className={cn("w-3.5 h-3.5 transition-transform", showAll && "rotate-180")} />
              {showAll ? "نمایش کمتر" : `${participants.length - 6} نفر دیگر`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function scoreSummary(sets) {
  if (!Array.isArray(sets) || sets.length === 0) return "-";
  return sets.map((set) => `${set.a}-${set.b}`).join(" | ");
}

function TournamentResultsBlock({ loading, matches, standings }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrophyIcon className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-bold text-foreground">نتایج و جدول</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/60 border-b border-border text-xs font-bold text-foreground">جدول رده‌بندی</div>
            {standings.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">هنوز نتیجه‌ای ثبت نشده است.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/35 text-muted-foreground border-b border-border">
                      <th className="px-2 py-2 text-right">#</th>
                      <th className="px-2 py-2 text-right">بازیکن</th>
                      <th className="px-2 py-2 text-right">امتیاز</th>
                      <th className="px-2 py-2 text-right">برد/باخت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.userId} className="border-b border-border/60">
                        <td className="px-2 py-2 font-bold">{row.rank}</td>
                        <td className="px-2 py-2">{row.name ?? "کاربر"}</td>
                        <td className="px-2 py-2 font-bold">{row.points}</td>
                        <td className="px-2 py-2">{row.wins}/{row.losses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {matches.length === 0 ? (
              <div className="text-xs text-muted-foreground">براکت هنوز ساخته نشده است.</div>
            ) : (
              matches.map((m) => (
                <div key={m.id} className="rounded-xl border border-border p-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-foreground">راند {m.round} · بازی {m.matchNumber}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full border text-[10px] font-bold",
                      m.status === "finished" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25" :
                      m.status === "walkover" ? "bg-blue-500/10 text-blue-600 border-blue-500/25" :
                      "bg-muted text-muted-foreground border-border"
                    )}>
                      {m.status === "finished" ? "پایان" : m.status === "walkover" ? "صعود خودکار" : "در انتظار"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.playerA?.name ?? "—"} <span className="mx-1">vs</span> {m.playerB?.name ?? "—"}
                  </div>
                  {(m.status === "finished" || m.status === "walkover") && (
                    <div className="mt-1 text-[11px] text-foreground" dir="ltr">{scoreSummary(m.scoreSets)}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main sheet ────────────────────────────────────────────────────────────────

export default function TournamentDetailSheet() {
  const [tournament, setTournament] = useAtom(selectedTournamentAtom);
  const [open, setOpen] = useAtom(tournamentDetailOpenAtom);
  const [, setTournaments] = useAtom(tournamentsAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsMatches, setResultsMatches] = useState([]);
  const [standings, setStandings] = useState([]);

  const userId = currentUser?.id ?? null;

  function patchTournamentState(patchFn, { syncFullObjectInList = false } = {}) {
    let nextTournament = null;

    setTournament((prev) => {
      if (!prev) return prev;
      nextTournament = patchFn(prev);
      return nextTournament;
    });

    if (!nextTournament?.id) return;

    setTournaments((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(nextTournament.id)) return item;
        return syncFullObjectInList
          ? { ...item, ...nextTournament }
          : { ...item, registeredCount: nextTournament.registeredCount };
      })
    );
  }

  function applyOptimisticRegistration(isRegistering) {
    patchTournamentState((prev) => {
      const participants = Array.isArray(prev.participants) ? prev.participants : [];
      const alreadyRegistered = participants.some((p) => String(p.userId) === String(userId));
      const baseCount = Number(prev.registeredCount ?? participants.length ?? 0);
      const maxCount = Number(prev.maxParticipants ?? Number.MAX_SAFE_INTEGER);

      if (isRegistering) {
        const nextParticipants = alreadyRegistered
          ? participants
          : [
              {
                id: `local-${userId}`,
                userId,
                name: currentUser?.name ?? currentUser?.fullName ?? "شما",
                image: currentUser?.image ?? null,
                paymentStatus: prev.entryFee === 0 ? "paid" : "pending",
              },
              ...participants,
            ];

        return {
          ...prev,
          participants: nextParticipants,
          registeredCount: Math.min(baseCount + (alreadyRegistered ? 0 : 1), maxCount),
        };
      }

      const nextParticipants = participants.filter((p) => String(p.userId) !== String(userId));
      const wasRegistered = nextParticipants.length !== participants.length;

      return {
        ...prev,
        participants: nextParticipants,
        registeredCount: Math.max(baseCount - (wasRegistered ? 1 : 0), 0),
      };
    });

    setRegistered(isRegistering);
  }

  function syncFetchedTournament(nextTournament) {
    patchTournamentState(() => nextTournament, { syncFullObjectInList: true });
  }

  useEffect(() => {
    if (!tournament || !userId) {
      setRegistered(false);
      return;
    }
    setRegistered(tournament.participants?.some(p => String(p.userId) === String(userId)) ?? false);
  }, [tournament, userId]);

  useEffect(() => {
    if (!open || !tournament?.id) return;
    setResultsLoading(true);
    tournamentService.getResults(tournament.id)
      .then((res) => {
        if (res.ok) {
          setResultsMatches(res.data.matches ?? []);
          setStandings(res.data.standings ?? []);
        }
      })
      .finally(() => setResultsLoading(false));
  }, [open, tournament?.id]);

  if (!tournament || !open) return null;

  const phase = tournament.phase ?? "registration";
  const phaseCfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.registration;
  const phaseHeaderBadge =
    phase === "registration"
      ? "text-emerald-100 bg-emerald-500/16 border-emerald-300/35"
      : phase === "ongoing"
      ? "text-blue-100 bg-blue-500/16 border-blue-300/35"
      : "text-zinc-100 bg-zinc-400/16 border-zinc-200/35";
  const isFree = tournament.entryFee === 0;
  const organizerClubName =
    tournament.club?.name ??
    tournament.club?.clubName ??
    tournament.clubName ??
    tournament.club?.title ??
    tournament.organizerClub?.name ??
    tournament.organizerClubName ??
    tournament.organizer?.name ??
    tournament.venue?.name ??
    null;
  const canRegister = phase === "registration" && !registered &&
    (tournament.registeredCount < tournament.maxParticipants);
  const fillRatio = tournament.registeredCount / tournament.maxParticipants;

  async function handleRegister() {
    setLoading(true);
    try {
      const res = await tournamentService.register(tournament.id);
      if (res.ok) {
        toast.success("ثبت‌نام با موفقیت انجام شد 🎉");
        applyOptimisticRegistration(true);
        const detail = await tournamentService.getTournament(tournament.id);
        if (detail.ok) syncFetchedTournament(detail.data.tournament);
      } else {
        toast.error(res.data?.message ?? "خطا در ثبت‌نام");
      }
    } finally { setLoading(false); }
  }

  async function handleUnregister() {
    setLoading(true);
    try {
      const res = await tournamentService.unregister(tournament.id);
      if (res.ok) {
        toast.success("انصراف ثبت شد");
        applyOptimisticRegistration(false);
        const detail = await tournamentService.getTournament(tournament.id);
        if (detail.ok) syncFetchedTournament(detail.data.tournament);
      } else {
        toast.error(res.data?.message ?? "خطا");
      }
    } finally { setLoading(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
          />

          <motion.div
            key="sheet"
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", damping:32, stiffness:320 }}
            className="fixed inset-0 z-50 bg-background h-[100dvh] pt-[env(safe-area-inset-top)] flex flex-col overflow-hidden shadow-2xl shadow-black/30"
          >
            {/* Drag pill */}
            <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2">
              <div className="w-10 h-1 rounded-full bg-white/70 shadow-sm" />
            </div>

            {/* Hero header */}
            <div className="relative shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.24),transparent_50%),linear-gradient(135deg,#0f172a_0%,#111827_55%,#1f2937_100%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/6 via-transparent to-black/26" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/55 to-transparent" />
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-sm hover:bg-white/30 transition-colors"
              >
                <XIcon className="w-4 h-4 text-white" />
              </button>

              <div className="relative px-4 pt-8 pb-3 space-y-2.5">
                <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white/85 backdrop-blur-md">
                  <TrophyIcon className="w-2.5 h-2.5" />
                  جزئیات تورنومنت
                </div>

                <div className="rounded-2xl border border-white/20 bg-black/16 p-2.5 backdrop-blur-md shadow-lg shadow-black/25">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/12 border border-white/20 flex items-center justify-center text-2xl shrink-0 shadow-md shadow-black/20 backdrop-blur-md">
                    {SPORT_ICONS[tournament.sportType] ?? "🏅"}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h2 className="font-black text-[19px] text-white leading-tight line-clamp-2 drop-shadow-sm">{tournament.title}</h2>
                      {organizerClubName && <p className="text-white/90 text-[11px] mt-1 font-semibold">🏢 باشگاه برگزارکننده: {organizerClubName}</p>}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md", phaseHeaderBadge)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", phaseCfg.dot)} />
                    {phaseCfg.label}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/14 border border-white/22 text-white/95 backdrop-blur-md">
                    <CoinsIcon className="w-3 h-3" />
                    {isFree ? "رایگان" : `${tournament.entryFee.toLocaleString("fa-IR")} تومان`}
                  </span>
                  {tournament.minLevel > 1 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/18 border border-amber-200/40 text-amber-50 backdrop-blur-md">
                      <StarIcon className="w-3 h-3" />سطح {tournament.minLevel}+
                    </span>
                  )}
                </div>

                {/* Phase stepper */}
                <PhaseSteps phase={phase} />

                {/* Capacity */}
                <div className="rounded-2xl border border-white/16 bg-black/14 p-2.5 backdrop-blur-sm">
                  <div className="flex justify-between text-[10px] text-white mb-1.5 font-semibold">
                    <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" />{tournament.registeredCount} ثبت‌نام</span>
                    <span>{tournament.maxParticipants - tournament.registeredCount} جای خالی</span>
                  </div>
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width:0 }}
                      animate={{ width:`${Math.min(fillRatio*100,100)}%` }}
                      transition={{ duration:0.8, ease:"easeOut" }}
                      className={cn("h-full rounded-full", fillRatio>=1?"bg-amber-400":fillRatio>0.7?"bg-violet-400":"bg-emerald-400")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4 space-y-5">

                {/* Countdown — only in registration phase */}
                {phase === "registration" && (
                  <CountdownBlock deadline={tournament.registrationDeadline} />
                )}

                {/* Ongoing banner */}
                {phase === "ongoing" && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                    <div>
                      <p className="text-blue-500 font-bold text-sm">مسابقه در حال برگزاری است</p>
                      <p className="text-blue-400/70 text-xs">
                        پایان: {new Date(tournament.endDate).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", month:"long", day:"numeric" })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Completed banner */}
                {phase === "completed" && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-500/10 border border-zinc-500/20">
                    <TrophyIcon className="w-5 h-5 text-amber-400 shrink-0" />
                    <p className="text-foreground font-bold text-sm">مسابقه به پایان رسیده است</p>
                  </div>
                )}

                {/* Description */}
                {tournament.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">{tournament.description}</p>
                )}

                {/* Prize */}
                {tournament.prize && (
                  <div className="rounded-2xl overflow-hidden border border-amber-500/20">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border-b border-amber-500/20">
                      <GiftIcon className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-bold text-amber-500">جوایز مسابقه</span>
                    </div>
                    <div className="px-4 py-3 bg-amber-500/5">
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{tournament.prize}</p>
                    </div>
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <InfoTile icon={<CalendarIcon className="w-4 h-4 text-violet-500" />} label="شروع">
                    {new Date(tournament.startDate).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", month:"long", day:"numeric" })}
                  </InfoTile>
                  <InfoTile icon={<CalendarIcon className="w-4 h-4 text-indigo-400" />} label="پایان">
                    {new Date(tournament.endDate).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", month:"long", day:"numeric" })}
                  </InfoTile>
                  <InfoTile icon={<TrophyIcon className="w-4 h-4 text-emerald-500" />} label="ورزش">
                    {tournament.sportType}
                  </InfoTile>
                  <InfoTile icon={<ShieldCheckIcon className="w-4 h-4 text-blue-400" />} label="مهلت ثبت‌نام">
                    {new Date(tournament.registrationDeadline).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", month:"short", day:"numeric" })}
                  </InfoTile>
                </div>

                {/* Results + standings */}
                {(phase === "ongoing" || phase === "completed") && (
                  <TournamentResultsBlock
                    loading={resultsLoading}
                    matches={resultsMatches}
                    standings={standings}
                  />
                )}

                {/* Participants */}
                <ParticipantsList
                  participants={tournament.participants ?? []}
                  max={tournament.maxParticipants}
                  currentUserId={userId}
                />

                {/* Rules */}
                {tournament.rules && (
                  <div className="rounded-2xl border border-border overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b border-border">
                      <ShieldCheckIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground">قوانین مسابقه</span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{tournament.rules}</p>
                    </div>
                  </div>
                )}

                <div className="h-2" />
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 px-5 pb-3 pt-3 border-t border-border bg-background/95 backdrop-blur-sm">
              {registered ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-600 font-bold">شما ثبت‌نام کرده‌اید</span>
                  </div>
                  {phase === "registration" && (
                    <button
                      onClick={handleUnregister}
                      disabled={loading}
                      className="w-full py-3 rounded-2xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {loading ? "در حال پردازش..." : "انصراف از مسابقه"}
                    </button>
                  )}
                </div>
              ) : canRegister ? (
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="relative w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-base shadow-lg shadow-violet-500/25 disabled:opacity-60 active:scale-[0.98] transition-transform overflow-hidden"
                >
                  <span className="relative z-10">
                    {loading ? "در حال ثبت‌نام..." : isFree ? "ثبت‌نام رایگان 🎯" : `ثبت‌نام — ${tournament.entryFee.toLocaleString("fa-IR")} تومان`}
                  </span>
                  {!loading && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                      animate={{ x:["-100%","200%"] }}
                      transition={{ repeat:Infinity, duration:2.5, ease:"linear", repeatDelay:1 }}
                    />
                  )}
                </button>
              ) : (
                <div className="py-3.5 rounded-2xl bg-muted border border-border text-center text-muted-foreground text-sm font-medium">
                  {phase === "ongoing"    && "⚡ مسابقه در حال برگزاری است"}
                  {phase === "completed"  && "🏁 این مسابقه به پایان رسیده"}
                  {phase === "registration" && tournament.registeredCount >= tournament.maxParticipants && "⚠️ ظرفیت تکمیل شده"}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoTile({ icon, label, children }) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border/60 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground">{children}</p>
    </div>
  );
}
