import "swiper/css";
import "swiper/css/free-mode";
import "react-spring-bottom-sheet/dist/style.css";
import "react-lazy-load-image-component/src/effects/blur.css";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, RefreshCwIcon, SearchIcon, ZapIcon, TrophyIcon } from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";

import { matchService } from "@/services/matchService";
import {
  matchesAtom,
  matchesLoadingAtom,
  selectedMatchAtom,
  createMatchOpenAtom,
} from "@/store/matchStore";
import MatchCard from "@/components/tournament/MatchCard";
import MatchDetailSheet from "@/components/tournament/MatchDetailSheet";
import JoinConfirmModal from "@/components/tournament/JoinConfirmModal";
import CreateMatchSheet from "@/components/tournament/CreateMatchSheet";
import TournamentListSection from "@/features/tournaments/components/TournamentListSection";
import LeaderboardSection from "@/features/ranking/LeaderboardSection";
import { cn } from "@/lib/utils";

const MAIN_TABS = [
  { value: "matchmaking", label: "بازی‌ها", icon: <ZapIcon className="w-3.5 h-3.5" /> },
  { value: "tournaments", label: "تورنومنت", icon: <TrophyIcon className="w-3.5 h-3.5" /> },
  { value: "leaderboard", label: "رنکینگ", icon: <TrophyIcon className="w-3.5 h-3.5" /> },
];

function MatchmakingSection() {
  const [matches, setMatches] = useAtom(matchesAtom);
  const [loading, setLoading] = useAtom(matchesLoadingAtom);
  const setSelectedMatch = useSetAtom(selectedMatchAtom);
  const setCreateOpen = useSetAtom(createMatchOpenAtom);
  const [search, setSearch] = useState("");

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await matchService.getMatches();
      if (res.ok) setMatches(res.data.matches);
      else toast.error("خطا در بارگذاری مسابقه‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, []);

  const filtered = search.trim()
    ? matches.filter(
        (m) =>
          m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.location.toLowerCase().includes(search.toLowerCase())
      )
    : matches;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو مسابقه یا مکان..."
          className="w-full bg-muted border border-border rounded-xl pr-9 pl-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors"
        />
        <button
          onClick={fetchMatches}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCwIcon className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Match list */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <span className="text-5xl block mb-4">🏟️</span>
            <p className="text-muted-foreground text-sm">مسابقه‌ای یافت نشد</p>
            <p className="text-muted-foreground/60 text-xs mt-1">یک مسابقه جدید بساز!</p>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {filtered.map((match, i) => (
              <MatchCard key={match.id} match={match} index={i} onClick={() => setSelectedMatch(match)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-20 right-5 h-14 w-14 rounded-full bg-primary shadow-xl flex items-center justify-center z-30"
      >
        <PlusIcon className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <MatchDetailSheet />
      <JoinConfirmModal />
      <CreateMatchSheet />
    </div>
  );
}

export default function TournamentPage() {
  const [activeTab, setActiveTab] = useState("matchmaking");

  const isClubOwner = (() => {
    try {
      const raw = localStorage.getItem("myket-ai-user");
      return raw ? JSON.parse(raw)?.isClubOwner ?? false : false;
    } catch { return false; }
  })();

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black mb-1"
        >
          {activeTab === "matchmaking"
            ? "مسابقات"
            : activeTab === "tournaments"
            ? "تورنومنت‌ها"
            : "رنکینگ"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-muted-foreground text-sm"
        >
          {activeTab === "matchmaking"
            ? "به مسابقه‌ای بپیوند یا یک مسابقه جدید بساز"
            : activeTab === "tournaments"
            ? "تورنومنت‌های کلاب‌ها را کشف کن و ثبت‌نام کن"
            : "جدول رتبه‌بندی بازیکنان را ببین"}
        </motion.p>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex gap-1.5 mt-4 p-1 bg-muted rounded-2xl"
        >
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                activeTab === tab.value
                  ? tab.value === "tournaments"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                    : tab.value === "leaderboard"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
                    : "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait">
          {activeTab === "matchmaking" ? (
            <motion.div
              key="matchmaking"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <MatchmakingSection />
            </motion.div>
          ) : activeTab === "tournaments" ? (
            <motion.div
              key="tournaments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TournamentListSection isClubOwner={isClubOwner} />
            </motion.div>
          ) : (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <LeaderboardSection mode="full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
