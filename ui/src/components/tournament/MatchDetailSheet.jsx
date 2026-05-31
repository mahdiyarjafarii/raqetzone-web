import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPinIcon, CalendarIcon, LogOutIcon, UsersIcon, ClockIcon, ShareIcon, ZapIcon, StarIcon, ShieldCheckIcon } from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";

import {
  selectedMatchAtom,
  joinConfirmAtom,
  joinLoadingAtom,
  matchesAtom,
} from "@/store/matchStore";
import { currentUserAtom } from "@/config/state";
import { matchService } from "@/services/matchService";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import UserProfileSheet from "@/components/ui/UserProfileSheet";

const SPORT_ICONS = {
  padel: "🏓",
  tennis: "🎾",
  squash: "🟡",
  badminton: "🏸",
  "ping-pong": "🏓",
};

function useCountdown(targetDate) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) { setLabel("شروع شد"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 24) setLabel(`${Math.floor(h / 24)} روز دیگر`);
      else if (h > 0) setLabel(`${h} ساعت و ${m} دقیقه مانده`);
      else setLabel(`${m} دقیقه مانده`);
    }
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [targetDate]);
  return label;
}

function formatDateFull(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fa-IR", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MatchDetailSheet() {
  const [selectedMatch, setSelectedMatch] = useAtom(selectedMatchAtom);
  const [joinLoading, setJoinLoading] = useAtom(joinLoadingAtom);
  const setJoinConfirm = useSetAtom(joinConfirmAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [, setMatches] = useAtom(matchesAtom);

  const match = selectedMatch;
  const currentUserId = currentUser?.id;
  const countdown = useCountdown(match?.scheduledAt);
  const [viewingUser, setViewingUser] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [compatibility, setCompatibility] = useState(null);
  const isUserInMatch =
    match && [...match.teamA, ...match.teamB].some((p) => p.userId === currentUserId);
  const isCreator = match?.createdBy === currentUserId;

  useEffect(() => {
    if (!match) return;
    matchService.getCompatibility(match.id).then((res) => {
      if (res.ok) setCompatibility(res.data.compatibility);
    });
  }, [match?.id]);

  const handleShare = async () => {
    if (!match) return;
    const res = await matchService.getInviteLink(match.id);
    if (!res.ok) { toast.error("خطا در دریافت لینک"); return; }
    const url = res.data.inviteUrl;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک دعوت کپی شد!");
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast.success("لینک دعوت کپی شد!");
    }
  };

  const handleEmergencySub = async () => {
    if (!match) return;
    setEmergencyLoading(true);
    try {
      const res = await matchService.emergencySub(match.id);
      if (res.ok) {
        toast.success(`پیام به ${res.data.notified} بازیکن ارسال شد! 🚨`);
      } else {
        toast.error(res.data?.message ?? "خطا");
      }
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!match) return;
    setJoinLoading(true);
    try {
      const res = await matchService.leaveMatch(match.id);
      if (res.ok) {
        const updated = res.data.match;
        setSelectedMatch(updated);
        setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        toast.success("از بازی خارج شدید");
      } else {
        toast.error(res.data?.message ?? "خطا در خروج از بازی");
      }
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {selectedMatch && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMatch(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] max-h-[88vh] flex flex-col overflow-hidden shadow-2xl shadow-black/30"
          >
            {/* Handle */}
            <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2">
              <div className="w-10 h-1 rounded-full bg-white/75 shadow-sm" />
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Hero section */}
              <div className="relative overflow-hidden rounded-t-[28px] px-5 pt-11 pb-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.34),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.28),transparent_34%),linear-gradient(180deg,rgba(248,250,252,1)_0%,rgba(245,243,255,0.92)_100%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.24),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.22),transparent_34%),linear-gradient(180deg,rgba(24,24,27,1)_0%,rgba(30,27,75,0.82)_100%)]" />
                <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <div className="relative flex items-start gap-4">
                  <div className="relative w-20 h-20 rounded-[26px] bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/15 flex items-center justify-center text-4xl shrink-0 shadow-xl shadow-blue-500/10 backdrop-blur-md">
                    <div className="absolute inset-2 rounded-[20px] bg-gradient-to-br from-white/70 to-white/20 dark:from-white/10 dark:to-white/5" />
                    <span className="relative">{SPORT_ICONS[match.sportType] ?? "🏅"}</span>
                  </div>
                  <div className="relative flex-1 min-w-0 pt-1">
                    <h2 className="text-2xl font-black text-foreground leading-tight tracking-tight">{match.title}</h2>
                    {match.isCertified && (
                      <div className="flex items-center gap-1 mt-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <ShieldCheckIcon className="w-3.5 h-3.5" />
                        گارانتی‌شده توسط رکت‌زون
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-semibold text-muted-foreground capitalize">{match.sportType}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full font-bold border shadow-sm",
                          match.status === "open"
                            ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                            : match.status === "full"
                            ? "bg-red-500/15 text-red-500 border-red-500/20"
                            : "bg-background/60 text-muted-foreground border-border"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            match.status === "open" ? "bg-emerald-500" : match.status === "full" ? "bg-red-500" : "bg-muted-foreground"
                          )}
                        />
                        {match.status === "open" ? "باز" : match.status === "full" ? "پر شد" : match.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info pills */}
                <div className="relative grid gap-2 mt-5">
                  <div className="flex items-center gap-2 bg-background/70 dark:bg-white/10 rounded-2xl px-3.5 py-3 border border-border/60 dark:border-white/10 shadow-sm backdrop-blur-md">
                    <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{formatDateFull(match.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-background/70 dark:bg-white/10 rounded-2xl px-3.5 py-3 border border-border/60 dark:border-white/10 shadow-sm backdrop-blur-md">
                    <MapPinIcon className="w-4 h-4 text-violet-500 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">
                      {match.courtName ? `${match.courtName} · ` : ""}{match.location}
                    </span>
                  </div>
                  {countdown && (
                    <div className="flex items-center gap-2 bg-amber-500/12 rounded-2xl px-3.5 py-3 border border-amber-500/20 shadow-sm">
                      <ClockIcon className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-sm font-black text-amber-600 dark:text-amber-300">{countdown}</span>
                    </div>
                  )}

                  {/* Compatibility pill */}
                  {compatibility !== null && !isUserInMatch && (
                    <div className="flex items-center gap-1.5 bg-violet-500/10 rounded-2xl px-3.5 py-2.5 border border-violet-500/20">
                      <StarIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-300">
                        سازگاری با این مچ: {compatibility}٪
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="mx-5 border-t border-transparent" />

              {/* Teams */}
              <div className="px-5 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <UsersIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">تیم‌ها</span>
                  <span className="text-xs text-muted-foreground mr-auto">
                    {match.teamA.length + match.teamB.length}/{match.teamSize * 2} نفر
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "تیم آبی", team: "A", players: match.teamA, color: "blue" },
                    { label: "تیم بنفش", team: "B", players: match.teamB, color: "violet" },
                  ].map(({ label, team, players, color }) => {
                    const isFull = players.length >= match.teamSize;
                    const isUserHere = players.some((p) => p.userId === currentUserId);
                    const canJoin = match.status === "open" && !isUserInMatch && !isFull;

                    return (
                      <div
                        key={team}
                        className={cn(
                          "rounded-2xl border-2 p-4 flex flex-col gap-3",
                          color === "blue" ? "border-blue-500/30 bg-blue-500/5" : "border-violet-500/30 bg-violet-500/5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-widest",
                            color === "blue" ? "text-blue-500" : "text-violet-500"
                          )}>
                            {label}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {players.length}/{match.teamSize}
                          </span>
                        </div>

                        {/* Player slots */}
                        <div className="space-y-2">
                          {Array.from({ length: match.teamSize }).map((_, i) => {
                            const player = players[i];
                            return (
                              <div
                                key={i}
                                onClick={() => player && player.userId !== currentUserId && setViewingUser(player)}
                                className={cn(
                                  "flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors",
                                  player
                                    ? player.userId !== currentUserId
                                      ? "bg-background/70 cursor-pointer hover:bg-muted/60 active:scale-[0.98]"
                                      : "bg-background/70"
                                    : "border border-dashed border-border"
                                )}
                              >
                                {player ? (
                                  <>
                                    <UserAvatar
                                      image={player.image}
                                      name={player.name}
                                      className="w-7 h-7 rounded-full text-xs text-white"
                                      fallbackClassName={cn(
                                        "w-7 h-7 rounded-full text-xs text-white",
                                        color === "blue" ? "bg-blue-500" : "bg-violet-500"
                                      )}
                                    />
                                    <span className="text-xs font-medium text-foreground truncate">{player.name}</span>
                                    {player.userId === currentUserId
                                      ? <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold mr-auto shrink-0">شما</span>
                                      : <span className="text-[9px] text-muted-foreground mr-auto shrink-0 opacity-50">👁</span>
                                    }
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50 px-1">جای خالی</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {canJoin && (
                          <button
                            onClick={() => setJoinConfirm({ matchId: match.id, team })}
                            disabled={joinLoading}
                            className={cn(
                              "w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95",
                              color === "blue" ? "bg-blue-500 shadow-blue-500/30 shadow-md" : "bg-violet-500 shadow-violet-500/30 shadow-md"
                            )}
                          >
                            {joinLoading ? "..." : `پیوستن به ${label}`}
                          </button>
                        )}

                        {isUserHere && (
                          <div className="text-center text-xs text-muted-foreground font-medium">
                            ✓ شما در این تیم هستید
                          </div>
                        )}

                        {isFull && !isUserHere && (
                          <div className="text-center text-xs text-muted-foreground">تیم پر است</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick actions row */}
              <div className="px-5 pb-3 flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-semibold text-muted-foreground active:scale-95 transition-all"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  دعوت
                </button>
                {isCreator && match.status !== "full" && match.status !== "completed" && (
                  <button
                    onClick={handleEmergencySub}
                    disabled={emergencyLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/8 text-xs font-bold text-orange-600 dark:text-orange-400 active:scale-95 transition-all disabled:opacity-60"
                  >
                    <ZapIcon className="w-3.5 h-3.5 shrink-0" />
                    {emergencyLoading ? "ارسال..." : "یار دقیقه‌نودی"}
                  </button>
                )}
              </div>

              {/* Actions for participants */}
              {isUserInMatch && (
                <div className="px-5 pb-6 space-y-2">
                  {/* Rate teammates */}
                  <button
                    onClick={() => setShowRating(true)}
                    className="w-full py-3 rounded-2xl border-2 border-violet-500/30 text-violet-600 dark:text-violet-400 text-sm font-semibold flex items-center justify-center gap-2 bg-violet-500/5 active:scale-[0.98] transition-all"
                  >
                    <StarIcon className="w-4 h-4" />
                    امتیاز به هم‌بازی‌ها
                  </button>
                  <button
                    onClick={handleLeave}
                    disabled={joinLoading}
                    className="w-full py-3 rounded-2xl border-2 border-red-500/30 text-red-500 text-sm font-semibold flex items-center justify-center gap-2 bg-red-500/5 active:scale-[0.98] transition-all"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    {joinLoading ? "در حال خروج..." : "خروج از بازی"}
                  </button>
                </div>
              )}

              <div className="h-4" />
            </div>
          </motion.div>

          {viewingUser && (
            <UserProfileSheet
              userId={viewingUser.userId}
              name={viewingUser.name}
              image={viewingUser.image}
              onClose={() => setViewingUser(null)}
            />
          )}

          {showRating && match && (
            <RatingSheet
              match={match}
              currentUserId={currentUserId}
              onClose={() => setShowRating(false)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Rating Sheet ─────────────────────────────────────────────────────────────

const RATING_TAGS = [
  "وقت‌شناس", "خوش‌اخلاق", "تیمی", "رقابتی", "مبتدی‌فرندلی",
  "حرفه‌ای", "شاد", "منضبط",
];

function RatingSheet({ match, currentUserId, onClose }) {
  const teammates = [...match.teamA, ...match.teamB].filter((p) => p.userId !== currentUserId);
  const [ratings, setRatings] = useState(() =>
    Object.fromEntries(teammates.map((p) => [p.userId, []]))
  );
  const [loading, setLoading] = useState(false);

  const toggleTag = (userId, tag) => {
    setRatings((prev) => {
      const current = prev[userId] ?? [];
      return {
        ...prev,
        [userId]: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
      };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const ratingArray = teammates.map((p) => ({ toUserId: p.userId, tags: ratings[p.userId] ?? [] }));
      const res = await matchService.rateMatch(match.id, ratingArray);
      if (res.ok) {
        toast.success("امتیازها ثبت شد ✨");
        onClose();
      } else {
        toast.error(res.data?.message ?? "خطا در ثبت");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-3xl max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        <div className="px-5 pt-2 pb-4 border-b border-border shrink-0">
          <h2 className="font-black text-lg">امتیاز به هم‌بازی‌ها</h2>
          <p className="text-xs text-muted-foreground mt-0.5">برچسب‌هایی که بهشون می‌خوری انتخاب کن</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {teammates.map((player) => (
            <div key={player.userId}>
              <div className="flex items-center gap-3 mb-3">
                <UserAvatar
                  image={player.image}
                  name={player.name}
                  className="w-9 h-9 rounded-full text-sm text-white"
                  fallbackClassName="w-9 h-9 rounded-full bg-primary text-white text-sm"
                />
                <span className="font-semibold text-sm">{player.name}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {RATING_TAGS.map((tag) => {
                  const selected = (ratings[player.userId] ?? []).includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(player.userId, tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-8 pt-3 border-t border-border bg-background shrink-0">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-base bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? "در حال ثبت..." : "ثبت امتیازها ✨"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
