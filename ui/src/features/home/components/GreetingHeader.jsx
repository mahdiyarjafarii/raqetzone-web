import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinIcon, CalendarCheckIcon, SearchIcon, SparklesIcon } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "صبح بخیر";
  if (h < 17) return "ظهر بخیر";
  return "عصر بخیر";
}

export default function GreetingHeader({ user }) {
  const firstName = user?.name?.split(" ")[0] ?? "بازیکن";

  return (
    <div className="px-4 pt-5 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/10 px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-sm backdrop-blur-md">
            <SparklesIcon className="w-3.5 h-3.5 text-primary" />
            {getGreeting()} {firstName}
          </div>
          <h1 className="mt-3 text-[28px] font-black text-foreground leading-tight tracking-tight">
            امروز کجا بازی کنیم؟
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            زمین، بازی دوستانه و آفرهای نزدیکت آماده‌ست.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-white/60 dark:bg-white/10 border border-white/60 dark:border-white/10 px-3 py-1.5 text-muted-foreground text-xs font-semibold shadow-sm backdrop-blur-md"
      >
        <MapPinIcon className="w-3.5 h-3.5 text-primary" />
        <span>تهران، ایران</span>
      </motion.div>

      {/* Search bar CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-5"
      >
        <Link to="/clubs">
          <div className="flex items-center gap-3 bg-white/90 dark:bg-card/90 rounded-[24px] px-4 py-4 border border-white/80 dark:border-border shadow-xl shadow-slate-200/60 dark:shadow-black/10 backdrop-blur-xl active:scale-[0.99] transition-transform">
            <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/10 flex items-center justify-center shrink-0">
              <SearchIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground text-sm font-semibold flex-1">جستجوی باشگاه ...</span>
            <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-2 rounded-2xl text-xs font-black shrink-0 shadow-lg shadow-primary/20">
              <CalendarCheckIcon className="w-3.5 h-3.5" />
              رزرو
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
