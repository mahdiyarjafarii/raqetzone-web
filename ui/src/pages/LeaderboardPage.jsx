import React from "react";
import { motion } from "framer-motion";
import LeaderboardSection from "@/features/ranking/LeaderboardSection";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24 px-4 pt-7">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-black mb-1"
      >
        لیدربورد کامل
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="text-sm text-muted-foreground mb-4"
      >
        رتبه‌بندی همه بازیکن‌ها با قابلیت فیلتر
      </motion.p>

      <LeaderboardSection mode="full" />
    </div>
  );
}
