import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinIcon, CalendarCheckIcon, SearchIcon } from "lucide-react";

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
      >
        
        <h1 className="text-1xl font-black text-foreground leading-snug">
         امروز کدوم زمین رو برات رزور کنم ؟
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-1.5 mt-1.5 text-muted-foreground text-xs"
      >
        <MapPinIcon className="w-3.5 h-3.5 text-primary" />
        <span>تهران، ایران</span>
      </motion.div>

      {/* Search bar CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4"
      >
        <Link to="/clubs">
          <div className="flex items-center gap-3 bg-muted rounded-2xl px-4 py-3.5 border border-border shadow-sm active:scale-[0.99] transition-transform">
            <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-sm flex-1">جستجوی مجموعه‌های ورزشی...</span>
            <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-bold shrink-0">
              <CalendarCheckIcon className="w-3.5 h-3.5" />
              رزرو
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
