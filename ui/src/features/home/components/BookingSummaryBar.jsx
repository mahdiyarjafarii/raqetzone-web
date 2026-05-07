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
        <div className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarCheckIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
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
          <ChevronLeftIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      </Link>
    </motion.div>
  );
}
