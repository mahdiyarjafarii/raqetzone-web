import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { RefreshCwIcon, PlusIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  tournamentsAtom,
  tournamentsLoadingAtom,
  selectedTournamentAtom,
  tournamentDetailOpenAtom,
  createTournamentOpenAtom,
} from "../store/tournamentStore";
import { tournamentService } from "../services/tournamentService";
import TournamentCard from "./TournamentCard";
import TournamentDetailSheet from "./TournamentDetailSheet";
import CreateTournamentSheet from "./CreateTournamentSheet";

const SPORTS = [
  { value: null, label: "همه" },
  { value: "padel", label: "🏓 پدل" },
  { value: "tennis", label: "🎾 تنیس" },
  { value: "squash", label: "🟡 اسکواش" },
  { value: "badminton", label: "🏸 بدمینتون" },
];

const PRICE_FILTERS = [
  { value: null, label: "همه" },
  { value: "free", label: "رایگان" },
  { value: "paid", label: "پولی" },
];

const AVAILABILITY_FILTERS = [
  { value: null, label: "همه" },
  { value: "open", label: "باز" },
  { value: "full", label: "پر" },
  { value: "closed", label: "بسته" },
];

export default function TournamentListSection({ isClubOwner = false }) {
  const [tournaments, setTournaments] = useAtom(tournamentsAtom);
  const [loading, setLoading] = useAtom(tournamentsLoadingAtom);
  const setSelectedTournament = useSetAtom(selectedTournamentAtom);
  const setDetailOpen = useSetAtom(tournamentDetailOpenAtom);
  const [createOpen, setCreateOpen] = useAtom(createTournamentOpenAtom);

  const [search, setSearch] = useState("");
  const [sport, setSport] = useState(null);
  const [price, setPrice] = useState(null);
  const [availability, setAvailability] = useState(null);

  async function fetchTournaments() {
    setLoading(true);
    try {
      const params = {};
      if (sport) params.sport = sport;
      if (price) params.price = price;
      if (availability) params.availability = availability;
      if (search.trim()) params.search = search.trim();

      const res = await tournamentService.getTournaments(params);
      if (res.ok) {
        setTournaments(res.data.tournaments);
      } else {
        toast.error("خطا در بارگذاری تورنومنت‌ها");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTournaments();
  }, [sport, price, availability]);

  const filtered = search.trim()
    ? tournaments.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tournaments;

  function openDetail(t) {
    setSelectedTournament(t);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchTournaments()}
          placeholder="جستجو تورنومنت..."
          className="w-full bg-muted border border-border rounded-xl pr-9 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors"
        />
      </div>


      {/* List */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
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
            <span className="text-5xl block mb-4">🏆</span>
            <p className="text-muted-foreground text-sm">تورنومنتی یافت نشد</p>
            {isClubOwner && (
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold"
              >
                ایجاد اولین تورنومنت
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {filtered.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} index={i} onClick={() => openDetail(t)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Sheet */}
      <TournamentDetailSheet />

      {/* Create Sheet */}
      {createOpen && (
        <CreateTournamentSheet
          onCreated={(tournament) => {
            setTournaments((prev) => [tournament, ...prev]);
          }}
        />
      )}

      {/* FAB for club owners */}
      {isClubOwner && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCreateOpen(true)}
          className="fixed bottom-20 right-5 h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-xl flex items-center justify-center z-30"
        >
          <PlusIcon className="w-6 h-6 text-white" />
        </motion.button>
      )}
    </div>
  );
}
