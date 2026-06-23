import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  MessageCircleIcon,
  TrophyIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import useAuth from "@/auth/useAuth";

const SPORT_EMOJI = {
  padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸", "ping-pong": "🏓",
};

function buildImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

const TOURNAMENT_STATUS_LABEL = {
  open: "باز",
  full: "تکمیل ظرفیت",
  closed: "بسته",
  ongoing: "درحال برگزاری",
  completed: "تکمیل‌شده",
};

function StatCard({ value, label, color }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-4 px-2">
      <span className={cn("text-2xl font-black tabular-nums", color)}>{value ?? "—"}</span>
      <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

function formatFaDate(value, options) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fa-IR", options).format(date);
}

function MatchResultBadge({ isWin }) {
  if (isWin === true) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">برد</span>;
  }
  if (isWin === false) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/25">باخت</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">نامشخص</span>;
}

export default function UserProfileSheet({ userId, name, image: initialImage, sportType = "padel", open = true, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isSelf = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiClient.get(`/profile/${userId}`, { sport: sportType }).then(({ ok, data }) => {
      if (ok) setProfile(data);
      setLoading(false);
    });
  }, [userId, sportType]);

  const user = profile?.user;
  const stats = profile?.stats;
  const ranking = profile?.ranking;
  const recentMatches = Array.isArray(profile?.recentMatches) ? profile.recentMatches : [];
  const recentTournaments = Array.isArray(profile?.recentTournaments) ? profile.recentTournaments : [];
  const avatarSrc = buildImageUrl(user?.image ?? initialImage);

  const joinedDateLabel = formatFaDate(user?.createdAt, { year: "numeric", month: "long", day: "numeric" });

  return (
    <AnimatePresence>
      {open && (
      <>
      <motion.div
        key="bd"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-[70] backdrop-blur-sm"
      />

      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[71] bg-background rounded-t-[28px] max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Drag pill */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-9 h-1 rounded-full bg-muted" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center z-10"
        >
          <XIcon className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex-1 overflow-y-auto">
          {/* Hero */}
          <div className="relative px-5 pt-6 pb-5 overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_65%_0%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_20%_30%,rgba(34,197,94,0.15),transparent_45%)]" />

            <div className="relative flex flex-col items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-[28px] shadow-xl"
                  style={user?.isCoach ? {
                    padding: "3px",
                    background: "linear-gradient(135deg, #f59e0b, #fde68a, #f59e0b)",
                    boxShadow: "0 0 14px rgba(251,191,36,0.55)",
                  } : {}}
                >
                  <div className="w-full h-full rounded-[24px] overflow-hidden border-4 border-white dark:border-background">
                    {loading ? (
                      <div className="w-full h-full bg-muted animate-pulse" />
                    ) : avatarSrc ? (
                      <img src={avatarSrc} alt={user?.name ?? name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-3xl font-black text-white"
                        style={{ background: "linear-gradient(135deg, #2563eb, #0ea5e9)" }}
                      >
                        {(user?.name ?? name)?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                </div>
                {user?.isCoach && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-white shadow-md whitespace-nowrap">
                    مربی
                  </div>
                )}
              </div>

              {/* Name */}
              {loading ? (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="h-7 w-36 bg-muted rounded-xl animate-pulse" />
                  <div className="h-5 w-24 bg-muted rounded-xl animate-pulse" />
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-foreground">{user?.name ?? name ?? "بازیکن"}</h2>

                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {user?.favoriteSport && (
                      <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-semibold">
                        {SPORT_EMOJI[user.favoriteSport]} {user.favoriteSport}
                      </span>
                    )}
                  </div>

                  {user?.bio && (
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{user.bio}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {!loading && ranking && (
            <div className="mx-5 rounded-2xl border border-border bg-card overflow-hidden mb-4">
              <div className="flex divide-x divide-x-reverse divide-border">
                <StatCard value={ranking.rank != null ? `#${ranking.rank}` : null} label="رنک" color="text-primary" />
                <StatCard value={ranking.points} label="امتیاز" color="text-foreground" />
                <StatCard value={ranking.matchesCount} label="مچ" color="text-emerald-600" />
                <StatCard value={ranking.tournamentsCount} label="تورنومنت" color="text-amber-600" />
              </div>
            </div>
          )}

          {!loading && (
            <div className="mx-5 rounded-2xl border border-border bg-card p-3 mb-4">
              <div className="flex items-center gap-1.5 font-bold text-foreground text-sm mb-2">
                <TrendingUpIcon className="w-4 h-4 text-primary" />
                تاریخچه مچ‌ها
              </div>
              {recentMatches.length === 0 ? (
                <p className="text-xs text-muted-foreground">تاریخچه مچی ثبت نشده است.</p>
              ) : (
                <div className="space-y-2">
                  {recentMatches.map((match) => {
                    const dateLabel = formatFaDate(match.scheduledAt ?? match.joinedAt, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div key={`${match.matchId}-${match.joinedAt}`} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{match.title ?? "مسابقه"}</p>
                          <MatchResultBadge isWin={match.isWin} />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{SPORT_EMOJI[match.sportType] ?? "🎾"} {match.sportType ?? "-"}</span>
                          <span>•</span>
                          <span>{dateLabel ?? "-"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!loading && (
            <div className="mx-5 rounded-2xl border border-border bg-card p-3 mb-4">
              <div className="flex items-center gap-1.5 font-bold text-foreground text-sm mb-2">
                <TrophyIcon className="w-4 h-4 text-amber-500" />
                تورنومنت‌ها
              </div>
              {recentTournaments.length === 0 ? (
                <p className="text-xs text-muted-foreground">تورنومنتی برای این بازیکن ثبت نشده است.</p>
              ) : (
                <div className="space-y-2">
                  {recentTournaments.map((item) => {
                    const startDateLabel = formatFaDate(item.startDate, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div key={item.registrationId} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{item.title ?? "تورنومنت"}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                            {TOURNAMENT_STATUS_LABEL[item.status] ?? item.status ?? "-"}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {SPORT_EMOJI[item.sportType] ?? "🎾"} {item.sportType ?? "-"} • شروع: {startDateLabel ?? "-"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Joined date */}
          {!loading && joinedDateLabel && (
            <div className="mx-5 mb-6 flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted/50 border border-border">
              <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                عضو از <span className="font-semibold text-foreground">{joinedDateLabel}</span>
              </span>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="px-5 pb-6 space-y-3">
              <div className="h-20 rounded-2xl bg-muted animate-pulse" />
              <div className="h-12 rounded-2xl bg-muted animate-pulse" />
            </div>
          )}

          {/* Message button */}
          {!loading && !isSelf && currentUser && (
            <div className="px-5 pb-8">
              <button
                onClick={async () => {
                  const { ok, data } = await apiClient.post("/dm/conversations", { targetUserId: userId });
                  if (ok) {
                    onClose();
                    navigate(`/messages/${data.conversation.id}`);
                  }
                }}
                className="w-full h-13 rounded-2xl bg-[#ef1871] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 active:scale-[0.98] transition-transform"
              >
                <MessageCircleIcon className="w-5 h-5" />
                ارسال پیام
              </button>
            </div>
          )}
        </div>
      </motion.div>
      </>
      )}
    </AnimatePresence>
  );
}
