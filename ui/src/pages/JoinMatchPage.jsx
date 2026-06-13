import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinIcon, CalendarIcon, UsersIcon, ShieldCheckIcon } from "lucide-react";
import toast from "react-hot-toast";

import { matchService } from "@/services/matchService";
import { useSetAtom } from "jotai";
import { selectedMatchAtom } from "@/store/matchStore";

const SPORT_ICONS = {
  padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸", "ping-pong": "🏓",
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fa-IR", {
    timeZone: "Asia/Tehran",
    weekday: "long", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function JoinMatchPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const setSelectedMatch = useSetAtom(selectedMatchAtom);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    matchService.getMatchByToken(token).then((res) => {
      if (res.ok) setMatch(res.data.match);
      else setError("این لینک نامعتبر یا منقضی شده است");
    }).catch(() => setError("خطا در بارگذاری")).finally(() => setLoading(false));
  }, [token]);

  const handleJoin = () => {
    if (!match) return;
    setSelectedMatch(match);
    navigate("/tournament");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
        <span className="text-5xl">😕</span>
        <p className="font-bold text-foreground">{error}</p>
        <button onClick={() => navigate("/")} className="text-sm text-primary font-semibold">
          برو به صفحه اصلی
        </button>
      </div>
    );
  }

  const totalSlots = match.teamSize * 2;
  const filledSlots = match.teamA.length + match.teamB.length;
  const isFull = match.status === "full";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Card */}
        <div className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.3),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.25),transparent_50%)] p-6 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl shadow-lg">
                {SPORT_ICONS[match.sportType] ?? "🏅"}
              </div>
              <div>
                <h1 className="text-xl font-black text-foreground leading-tight">{match.title}</h1>
                {match.isCertified && (
                  <div className="flex items-center gap-1 mt-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                    گارانتی رکت‌زون
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-medium">{formatDate(match.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <MapPinIcon className="w-4 h-4 text-violet-500 shrink-0" />
              <span className="font-medium">{match.courtName ? `${match.courtName} · ` : ""}{match.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <UsersIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{filledSlots} از {totalSlots} نفر پر شده</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(filledSlots / totalSlots) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Invite text */}
          <div className="px-5 pb-5">
            <p className="text-xs text-muted-foreground text-center mb-4">
              شما دعوت شده‌اید. برای پیوستن به این بازی دکمه زیر را بزنید.
            </p>
            <button
              onClick={handleJoin}
              disabled={isFull}
              className={
                isFull
                  ? "w-full py-4 rounded-2xl bg-muted text-muted-foreground font-bold text-base cursor-not-allowed"
                  : "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
              }
            >
              {isFull ? "این بازی پر شده" : "پیوستن به بازی 🎮"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          رکت‌زون — پلتفرم مچ‌میکینگ ورزشی
        </p>
      </motion.div>
    </div>
  );
}
