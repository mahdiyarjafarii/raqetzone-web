import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheckIcon, ChevronLeftIcon } from "lucide-react";

export default function BookingSummaryBar({ summary }) {
  if (!summary || summary.total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4"
    >
      <Link to="/mybooking">
        <div className="relative overflow-hidden flex items-center justify-between bg-white/90 dark:bg-card border border-primary/15 rounded-[24px] px-4 py-3.5 shadow-lg shadow-slate-200/45 dark:shadow-black/10">
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-primary/10 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
              <CalendarCheckIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="relative">
              <p className="text-foreground text-sm font-bold">رزروهای من</p>
              <p className="text-muted-foreground text-xs">
                {summary.pending > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {summary.pending} در انتظار تأیید
                  </span>
                )}
                {summary.approved > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium mr-2">
                    {summary.approved} تأیید شده
                  </span>
                )}
              </p>
            </div>
          </div>
          <ChevronLeftIcon className="relative w-4 h-4 text-muted-foreground" />
        </div>
      </Link>
    </motion.div>
  );
}
