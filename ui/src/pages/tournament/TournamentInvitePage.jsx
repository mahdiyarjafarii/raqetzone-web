import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useSetAtom } from "jotai";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  Clock3Icon,
  CoinsIcon,
  MapPinIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";

import storage from "@/auth/storage";
import { authCallbacksAtom, showAuthSheetAtom } from "@/config/state";
import { tournamentService } from "@/features/tournaments/services/tournamentService";
import { cn } from "@/lib/utils";

const SPORT_ICONS = {
  padel: "🏓",
  tennis: "🎾",
  squash: "🟡",
  badminton: "🏸",
  "ping-pong": "🏓",
};

const PHASE_COPY = {
  registration: { label: "ثبت‌نام باز است", tone: "text-emerald-700 border-emerald-200 bg-emerald-50" },
  ongoing: { label: "در حال برگزاری", tone: "text-blue-700 border-blue-200 bg-blue-50" },
  completed: { label: "پایان یافته", tone: "text-slate-500 border-slate-200 bg-slate-50" },
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fa-IR-u-ca-persian", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value) {
  const price = Number(value ?? 0);
  return price === 0 ? "رایگان" : `${price.toLocaleString("fa-IR")} تومان`;
}

function StatCard({ icon, label, value, accent = "text-white" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50", accent)}>
        {icon}
      </div>
      <div className="mt-2 min-w-0">
        <p className="text-[11px] font-bold text-slate-400">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-black leading-6 text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function TournamentInvitePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setShowAuthSheet = useSetAtom(showAuthSheetAtom);
  const setAuthCallbacks = useSetAtom(authCallbacksAtom);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    tournamentService.getTournament(id)
      .then((res) => {
        if (res.ok) setTournament(res.data.tournament);
        else setError(res.data?.message ?? "این دعوت‌نامه پیدا نشد");
      })
      .catch(() => setError("خطا در بارگذاری دعوت‌نامه"))
      .finally(() => setLoading(false));
  }, [id]);

  const phase = tournament?.phase ?? "registration";
  const phaseCopy = PHASE_COPY[phase] ?? PHASE_COPY.registration;
  const registeredCount = tournament?.registeredCount ?? 0;
  const maxParticipants = tournament?.maxParticipants ?? 1;
  const organizerClubName =
    tournament?.club?.name ??
    tournament?.club?.clubName ??
    tournament?.clubName ??
    tournament?.club?.title ??
    tournament?.organizerClub?.name ??
    tournament?.organizerClubName ??
    tournament?.organizer?.name ??
    tournament?.venue?.name ??
    null;
  const fillRatio = Math.min((registeredCount / maxParticipants) * 100, 100);
  const seatsLeft = Math.max(maxParticipants - registeredCount, 0);
  const canJoin = phase === "registration" && seatsLeft > 0;

  function handleJoin() {
    if (!canJoin) return;
    if (!storage.getToken()) {
      setAuthCallbacks({
        onSuccess: () => navigate("/tournament"),
        onError: null,
      });
      setShowAuthSheet(true);
      return;
    }
    navigate("/tournament");
  }

  if (loading) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 text-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center text-slate-950">
        <div>
          <p className="text-6xl">😕</p>
          <h1 className="mt-5 text-xl font-black">{error}</h1>
          <button onClick={() => navigate("/")} className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            رفتن به رکت‌زون
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="relative h-dvh overflow-y-auto overflow-x-hidden bg-slate-100 text-slate-950 overscroll-contain [-webkit-overflow-scrolling:touch]">
      <main className="mx-auto w-full max-w-md px-4 py-5 sm:py-7">
        <div className="min-h-[calc(100dvh-2rem)] w-full">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-[0_10px_35px_-25px_rgba(15,23,42,0.55)]"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <button onClick={() => navigate("/")} className="flex items-center gap-3">
                <img src="/logo.png" alt="رکت‌زون" className="h-10 w-10 rounded-2xl object-contain" />
                <div className="text-right">
                  <p className="text-sm font-black text-slate-950">رکت‌زون</p>
                  <p className="text-xs font-medium text-slate-400">دعوت‌نامه مسابقه</p>
                </div>
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                  {SPORT_ICONS[tournament.sportType] ?? "🏆"}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-black leading-8 tracking-[-0.02em] text-slate-950">
                    {tournament.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black", phaseCopy.tone)}>
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {phaseCopy.label}
                    </span>
                    {organizerClubName && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        باشگاه برگزارکننده: {organizerClubName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {tournament.description && (
                <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
                  {tournament.description}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <StatCard icon={<CalendarDaysIcon className="h-4.5 w-4.5" />} label="شروع" value={formatDate(tournament.startDate)} accent="text-slate-500" />
                <StatCard icon={<Clock3Icon className="h-4.5 w-4.5" />} label="مهلت ثبت‌نام" value={formatDate(tournament.registrationDeadline)} accent="text-slate-500" />
                <StatCard icon={<CoinsIcon className="h-4.5 w-4.5" />} label="ورودی" value={formatPrice(tournament.entryFee)} accent="text-slate-500" />
                <StatCard icon={<StarIcon className="h-4.5 w-4.5" />} label="حداقل سطح" value={`سطح ${tournament.minLevel ?? 1}+`} accent="text-slate-500" />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5" /> ظرفیت</span>
                  <span>{registeredCount.toLocaleString("fa-IR")} از {maxParticipants.toLocaleString("fa-IR")}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${fillRatio}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="h-full rounded-full bg-slate-950"
                  />
                </div>
                <p className="mt-3 text-center text-xs font-bold text-slate-500">
                  {seatsLeft > 0 ? `${seatsLeft.toLocaleString("fa-IR")} جای خالی باقی مانده` : "ظرفیت تکمیل شده"}
                </p>
              </div>

              <button
                onClick={handleJoin}
                disabled={!canJoin}
                className={cn(
                  "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-black transition-all active:scale-[0.98]",
                  canJoin
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                {canJoin ? <><CheckCircle2Icon className="h-5 w-5" /> ثبت‌نام در تورنومنت</> : "ثبت‌نام امکان‌پذیر نیست"}
              </button>
            </div>
          </motion.section>
          <p className="mt-4 text-center text-[11px] font-bold text-slate-400">Raqetzone</p>
        </div>
      </main>
    </div>
  );
}
