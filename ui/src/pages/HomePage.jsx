import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/pagination";
import "react-spring-bottom-sheet/dist/style.css";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCwIcon, Gamepad2Icon, TrophyIcon, ChevronLeftIcon } from "lucide-react";
import { useAtomValue } from "jotai";
import { Link } from "react-router-dom";

import { currentUserAtom } from "@/config/state";
import { useHomeData } from "@/features/home/hooks/useHomeData";
import GreetingHeader from "@/features/home/components/GreetingHeader";
import QuickActions from "@/features/home/components/QuickActions";
import PromoBannerCarousel from "@/features/home/components/PromoBannerCarousel";
import HomeLeaderboardPreview from "@/features/home/components/HomeLeaderboardPreview";
import DealsSection from "@/features/home/components/DealsSection";
import HomeCourtsSection from "@/features/home/components/HomeCourtsSection";
import BookingSummaryBar from "@/features/home/components/BookingSummaryBar";
import HomeMatchSections from "@/features/home/components/HomeMatchSections";
import HomeTournamentsSection from "@/features/home/components/HomeTournamentsSection";

function SectionDivider() {
  return <div className="h-5" />;
}

export default function HomePage() {
  const currentUser = useAtomValue(currentUserAtom);
  const { data, loading, refetch } = useHomeData();

  return (
    <>
    <div className="relative min-h-screen overflow-hidden bg-[#fbfaf8] text-foreground pb-28 dark:bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_75%_0%,rgba(43,15,217,0.16),transparent_38%),radial-gradient(circle_at_15%_8%,rgba(239,24,113,0.10),transparent_32%)]" />
      <div className="relative">
      {/* ── Greeting ── */}
      <GreetingHeader user={currentUser} />

      {/* ── Quick Actions ── */}
      <QuickActions />

      <div className="px-4 mb-2">
        <div className="relative rounded-2xl overflow-hidden p-[2px]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[240%] w-[240%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,rgba(14,165,233,0.14)_0%,rgba(56,189,248,0.75)_18%,rgba(250,204,21,0.7)_36%,rgba(14,165,233,0.14)_52%,rgba(14,165,233,0.14)_100%)] animate-spin [animation-duration:3.6s]" />

          <Link
            to="/game/tennis-duel"
            className="relative z-1 overflow-hidden flex items-center justify-between rounded-2xl bg-sky-500 text-white px-3 py-2.5 shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-transform"
          >
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white/15 to-transparent" />

            <div className="relative h-9 w-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
              <Gamepad2Icon className="w-4 h-4" />
            </div>

            <div className="relative flex-1 text-right pr-2">
              <p className="text-sm font-black leading-tight">شروع مینی‌گیم</p>
              <p className="text-[11px] text-white/90 font-semibold mt-0.5">برد = جایزه روزانه</p>
            </div>

            <div className="relative flex items-center gap-1.5">
              <div className="h-7 px-2 rounded-full bg-white/20 border border-white/30 flex items-center gap-1 text-[11px] font-bold">
                <TrophyIcon className="w-3.5 h-3.5" />
                جایزه
              </div>
              <ChevronLeftIcon className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      <SectionDivider />

      {/* ── Match Sections ── */}
      <HomeMatchSections data={data} loading={loading} />

      <SectionDivider />

      {/* ── Tournaments ── */}
      <HomeTournamentsSection />

      <SectionDivider />

      {/* ── Promo Banners ── */}
      <PromoBannerCarousel
        promotions={data?.promotions ?? []}
        loading={loading}
      />

      <SectionDivider />

      {/* ── Leaderboard Preview ── */}
      <HomeLeaderboardPreview />

      <SectionDivider />

      {/* ── Flash Deals ── */}
      <DealsSection
        deals={data?.deals ?? []}
        loading={loading}
      />

      {data?.deals?.length > 0 && <SectionDivider />}

      {/* ── Booking summary bar ── */}
      <BookingSummaryBar summary={data?.bookingSummary} />

      {data?.bookingSummary?.total > 0 && <SectionDivider />}

      {/* ── Nearby Courts ── */}
      <HomeCourtsSection
        courts={data?.featuredCourts ?? []}
        loading={loading}
      />

      <SectionDivider />

      {/* Refresh hint */}
      <AnimatePresence>
        {!loading && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={refetch}
            className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground py-2 px-4 rounded-full border border-border bg-card mb-2"
          >
            <RefreshCwIcon className="w-3 h-3" />
            بروزرسانی
          </motion.button>
        )}
      </AnimatePresence>
      </div>
    </div>
    </>
  );
}
