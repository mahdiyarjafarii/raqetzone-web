import React, { useState } from "react";
import { motion } from "framer-motion";
import { SearchIcon, MapPinIcon, RefreshCwIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ClubCard from "@/features/clubs/components/ClubCard";
import { useClubs } from "@/features/clubs/hooks/useClubs";

const SPORT_FILTERS = [
  { key: "all",      label: "همه"        },
  { key: "padel",    label: "پدل"       },
  { key: "tennis",   label: "تنیس"       },
  { key: "squash",   label: "اسکواش"     },
  { key: "badminton",label: "بدمینتون"   },
];

const IRAN_PROVINCES = [
  "آذربایجان شرقی","آذربایجان غربی","اردبیل","اصفهان","البرز","ایلام","بوشهر","تهران",
  "چهارمحال و بختیاری","خراسان جنوبی","خراسان رضوی","خراسان شمالی","خوزستان","زنجان",
  "سمنان","سیستان و بلوچستان","فارس","قزوین","قم","کردستان","کرمان","کرمانشاه",
  "کهگیلویه و بویراحمد","گلستان","گیلان","لرستان","مازندران","مرکزی","هرمزگان","همدان","یزد",
];

const PROVINCE_KEY = "raqetzone_province";

function getStoredProvince() {
  try { return localStorage.getItem(PROVINCE_KEY) ?? ""; } catch { return ""; }
}

export default function ClubsPage() {
  const { clubs, loading, refetch } = useClubs();
  const [search, setSearch]         = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [province, setProvince]     = useState(getStoredProvince);
  const [showProvinceMenu, setShowProvinceMenu] = useState(false);

  const handleProvinceChange = (p) => {
    setProvince(p);
    try { if (p) localStorage.setItem(PROVINCE_KEY, p); else localStorage.removeItem(PROVINCE_KEY); } catch {}
    setShowProvinceMenu(false);
  };

  const filtered = clubs.filter((club) => {
    const types = club.sportTypes ?? [];
    const matchSport = sportFilter === "all" || types.includes(sportFilter);
    const matchProvince = !province || club.province === province;
    const q = search.trim();
    const matchSearch = !q ||
      club.name?.includes(q) ||
      club.location?.includes(q) ||
      club.address?.includes(q);
    return matchSport && matchProvince && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-black text-foreground">مجموعه‌های ورزشی</h1>
            <div className="relative">
              <button
                onClick={() => setShowProvinceMenu(v => !v)}
                className="flex items-center gap-1 text-xs font-medium text-foreground bg-muted rounded-full px-3 py-1.5 border border-border active:scale-95 transition-transform"
              >
                <MapPinIcon className="w-3.5 h-3.5 text-primary" />
                <span>{province || "همه استان‌ها"}</span>
                <ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
              </button>
              {showProvinceMenu && (
                <div className="absolute left-0 top-8 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-48 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleProvinceChange("")}
                    className={cn("w-full text-right text-xs px-4 py-2.5 hover:bg-muted transition-colors", !province && "font-semibold text-primary")}
                  >
                    همه استان‌ها
                  </button>
                  {IRAN_PROVINCES.map(p => (
                    <button
                      key={p}
                      onClick={() => handleProvinceChange(p)}
                      className={cn("w-full text-right text-xs px-4 py-2.5 hover:bg-muted transition-colors", province === p && "font-semibold text-primary bg-primary/5")}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            {loading ? "در حال بارگذاری..." : `${filtered.length} مجموعه`}
          </p>
        </motion.div>
      </div>

      {/* ── Search ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 mb-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-2xl px-3 py-3 border border-transparent focus-within:border-ring transition-colors">
            <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو مجموعه یا منطقه..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none text-right"
            />
          </div>
          <button
            onClick={refetch}
            className="h-11 w-11 rounded-2xl bg-muted border border-border flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <RefreshCwIcon className={cn("w-4 h-4 text-foreground", loading && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      {/* ── Sport filters ── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3"
      >
        {SPORT_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setSportFilter(f.key)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all",
              sportFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border"
            )}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* ── Club cards ── */}
      <div className="px-4 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">🏟️</span>
            <p className="text-muted-foreground text-sm">مجموعه‌ای یافت نشد</p>
          </div>
        ) : (
          filtered.map((club, i) => (
            <ClubCard key={club.id} club={club} index={i} />
          ))
        )}
      </div>
    </div>
  );
}
