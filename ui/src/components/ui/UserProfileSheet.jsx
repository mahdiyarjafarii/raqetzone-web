import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XIcon, TrophyIcon, SwordsIcon, TrendingUpIcon,
  StarIcon, ZapIcon, CalendarIcon, MessageCircleIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import useAuth from "@/auth/useAuth";

const SKILL_CONFIG = {
  beginner:     { label: "مبتدی",   color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  intermediate: { label: "متوسط",   color: "bg-blue-500/15    text-blue-600    border-blue-500/30"    },
  advanced:     { label: "پیشرفته", color: "bg-violet-500/15  text-violet-600  border-violet-500/30"  },
  pro:          { label: "حرفه‌ای", color: "bg-amber-500/15   text-amber-600   border-amber-500/30"   },
};

const SPORT_EMOJI = {
  padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸", "ping-pong": "🏓",
};

function buildImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-4 px-2">
      <span className={cn("text-2xl font-black tabular-nums", color)}>{value ?? "—"}</span>
      <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

function XpBar({ level }) {
  if (!level) return null;
  const { current, progressPct, rank, progressXp, neededXp } = level;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="font-black text-foreground">سطح {current}</span>
        <span className="text-muted-foreground">{progressXp} / {neededXp} XP</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${rank?.gradient?.[0] ?? "#6366f1"}, ${rank?.gradient?.[1] ?? "#8b5cf6"})` }}
        />
      </div>
    </div>
  );
}

export default function UserProfileSheet({ userId, name, image: initialImage, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isSelf = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiClient.get(`/profile/${userId}`).then(({ ok, data }) => {
      if (ok) setProfile(data);
      setLoading(false);
    });
  }, [userId]);

  const user = profile?.user;
  const stats = profile?.stats;
  const level = profile?.level;
  const skill = SKILL_CONFIG[user?.skillLevel] ?? null;
  const avatarSrc = buildImageUrl(user?.image ?? initialImage);

  const joinedYear = user?.createdAt
    ? new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).format(new Date(user.createdAt))
    : null;

  return (
    <AnimatePresence>
      <motion.div
        key="bd"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
      />

      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] max-h-[85vh] flex flex-col overflow-hidden"
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
            {/* Gradient bg */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: level?.rank?.gradient
                  ? `radial-gradient(circle at 60% 0%, ${level.rank.gradient[0]}55, transparent 60%), radial-gradient(circle at 20% 30%, ${level.rank.gradient[1]}33, transparent 50%)`
                  : "radial-gradient(circle at 60% 0%, #6366f155, transparent 60%)",
              }}
            />

            <div className="relative flex flex-col items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-[28px] overflow-hidden border-4 border-white dark:border-background shadow-xl">
                  {loading ? (
                    <div className="w-full h-full bg-muted animate-pulse" />
                  ) : avatarSrc ? (
                    <img src={avatarSrc} alt={user?.name ?? name} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-3xl font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${level?.rank?.gradient?.[0] ?? "#6366f1"}, ${level?.rank?.gradient?.[1] ?? "#8b5cf6"})` }}
                    >
                      {(user?.name ?? name)?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>

                {/* Level badge */}
                {!loading && level && (
                  <div
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-black text-white shadow-md"
                    style={{ background: `linear-gradient(135deg, ${level.rank?.gradient?.[0] ?? "#6366f1"}, ${level.rank?.gradient?.[1] ?? "#8b5cf6"})` }}
                  >
                    {level.current}
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
                    {skill && (
                      <span className={cn("text-xs px-3 py-1 rounded-full font-bold border", skill.color)}>
                        {skill.label}
                      </span>
                    )}
                    {user?.favoriteSport && (
                      <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-semibold">
                        {SPORT_EMOJI[user.favoriteSport]} {user.favoriteSport}
                      </span>
                    )}
                    {level?.rank && (
                      <span
                        className="text-xs px-3 py-1 rounded-full font-bold text-white"
                        style={{ background: `linear-gradient(90deg, ${level.rank.gradient[0]}, ${level.rank.gradient[1]})` }}
                      >
                        {level.rank.label}
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

          {/* XP bar */}
          {!loading && level && (
            <div className="px-5 pb-4">
              <XpBar level={level} />
            </div>
          )}

          {/* Stats */}
          {!loading && stats && (
            <div className="mx-5 rounded-2xl border border-border bg-card overflow-hidden mb-4">
              <div className="flex divide-x divide-x-reverse divide-border">
                <StatCard icon={SwordsIcon}    value={stats.totalMatches}                         label="کل بازی‌ها"   color="text-foreground" />
                <StatCard icon={TrophyIcon}    value={stats.wins}                                 label="برد"          color="text-emerald-500" />
                <StatCard icon={TrendingUpIcon} value={stats.winRate != null ? `${stats.winRate}%` : null} label="نرخ برد" color="text-primary" />
              </div>
            </div>
          )}

          {/* Joined date */}
          {!loading && joinedYear && (
            <div className="mx-5 mb-6 flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted/50 border border-border">
              <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                عضو از <span className="font-semibold text-foreground">{joinedYear}</span>
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
    </AnimatePresence>
  );
}
