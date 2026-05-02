import "swiper/css";
import "swiper/css/free-mode";
import "react-spring-bottom-sheet/dist/style.css";
import "react-lazy-load-image-component/src/effects/blur.css";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

const SPORTS = [
  { value: null, label: "همه" },
  { value: "padel", label: "🏓 پادل" },
  { value: "tennis", label: "🎾 تنیس" },
  { value: "squash", label: "🟡 اسکواش" },
  { value: "badminton", label: "🏸 بدمینتون" },
];

const STATUS_TABS = [
  { value: "open", label: "باز" },
  { value: "full", label: "پر" },
];

export default function TournamentPage() {
  const [matches, setMatches] = useAtom(matchesAtom);
  const [loading, setLoading] = useAtom(matchesLoadingAtom);
  const setSelectedMatch = useSetAtom(selectedMatchAtom);
  const setCreateOpen = useSetAtom(createMatchOpenAtom);

  const [activeSport, setActiveSport] = useState(null);
  const [activeStatus, setActiveStatus] = useState("open");
  const [search, setSearch] = useState("");

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = { status: activeStatus };
      if (activeSport) params.sport = activeSport;
      const res = await matchService.getMatches(params);
      if (res.ok) {
        setMatches(res.data.matches);
      } else {
        toast.error("خطا در بارگذاری مسابقه‌ها");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [activeStatus, activeSport]);

  const filtered = search.trim()
    ? matches.filter(
        (m) =>
          m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.location.toLowerCase().includes(search.toLowerCase())
      )
    : matches;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black mb-1"
        >
          مسابقات
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-muted-foreground text-sm"
        >
          به مسابقه‌ای بپیوند یا یک مسابقه جدید بساز
        </motion.p>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="relative mt-4"
        >
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو مسابقه یا مکان..."
            className="w-full bg-muted border border-border rounded-xl pr-9 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors"
          />
        </motion.div>
      </div>

      <div className="px-4 space-y-3">
        {/* Status tabs */}
        <div className="flex gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-semibold border transition-all",
                activeStatus === tab.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sport filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {SPORTS.map((sport) => (
            <button
              key={sport.value ?? "all"}
              onClick={() => setActiveSport(sport.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all",
                activeSport === sport.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {sport.label}
            </button>
          ))}

          <button
            onClick={fetchMatches}
            className="ml-auto p-1.5 rounded-full bg-muted border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            <RefreshCwIcon className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Match list */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
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
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filtered.map((match, i) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  index={i}
                  onClick={() => setSelectedMatch(match)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-20 right-5 h-14 w-14 rounded-full bg-primary shadow-xl flex items-center justify-center z-50"
      >
        <PlusIcon className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <MatchDetailSheet />
      <JoinConfirmModal />
      <CreateMatchSheet />
    </div>
  );
}
