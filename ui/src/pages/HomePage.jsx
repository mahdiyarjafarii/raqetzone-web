import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/pagination";
import "react-spring-bottom-sheet/dist/style.css";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCwIcon } from "lucide-react";
import { useAtomValue } from "jotai";

import { currentUserAtom } from "@/config/state";
import { useHomeData } from "@/features/home/hooks/useHomeData";
import GreetingHeader from "@/features/home/components/GreetingHeader";
import QuickActions from "@/features/home/components/QuickActions";
import PromoBannerCarousel from "@/features/home/components/PromoBannerCarousel";
import MatchesCarousel from "@/features/home/components/MatchesCarousel";
import DealsSection from "@/features/home/components/DealsSection";
import HomeCourtsSection from "@/features/home/components/HomeCourtsSection";
import BookingSummaryBar from "@/features/home/components/BookingSummaryBar";

function SectionDivider() {
  return <div className="h-5" />;
}

export default function HomePage() {
  const currentUser = useAtomValue(currentUserAtom);
  const { data, loading, refetch } = useHomeData();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbfaf8] text-foreground pb-28 dark:bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_75%_0%,rgba(43,15,217,0.16),transparent_38%),radial-gradient(circle_at_15%_8%,rgba(239,24,113,0.10),transparent_32%)]" />
      <div className="relative">
      {/* ── Greeting ── */}
      <GreetingHeader user={currentUser} />

      {/* ── Quick Actions ── */}
      <QuickActions />

      <SectionDivider />

      {/* ── Promo Banners ── */}
      <PromoBannerCarousel
        promotions={data?.promotions ?? []}
        loading={loading}
      />

      <SectionDivider />

      {/* ── Active Matches ── */}
      <MatchesCarousel
        matches={data?.upcomingMatches ?? []}
        loading={loading}
      />

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
  );
}
