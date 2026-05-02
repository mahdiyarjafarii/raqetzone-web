import React from "react";
import { motion } from "framer-motion";
import { MapPinIcon } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "صبح بخیر";
  if (h < 17) return "ظهر بخیر";
  return "عصر بخیر";
}

export default function GreetingHeader({ user }) {
  const firstName = user?.name?.split(" ")[0] ?? "بازیکن";

  return (
    <div className="px-4 pt-4 pb-3">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-muted-foreground text-sm">{getGreeting()} 👋</p>
        <h1 className="text-xl font-black text-foreground mt-0.5">
          {firstName}، آماده بازی‌ای؟
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-1.5 mt-2 text-muted-foreground text-xs"
      >
        <MapPinIcon className="w-3.5 h-3.5 text-primary" />
        <span>تهران، ایران</span>
      </motion.div>
    </div>
  );
}
