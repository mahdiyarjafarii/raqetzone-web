import React from "react";
import { motion } from "framer-motion";
import {
  ParkingCircleIcon,
  LockIcon,
  ShowerHeadIcon,
  CoffeeIcon,
  WifiIcon,
  SunIcon,
  ShoppingBagIcon,
  AwardIcon,
  HeartPulseIcon,
  WindIcon,
} from "lucide-react";

const AMENITY_CONFIG = {
  parking:  { icon: ParkingCircleIcon, label: "پارکینگ",        gradient: "from-blue-500/20 to-blue-600/10",   iconColor: "text-blue-600 dark:text-blue-400",   ring: "ring-blue-500/20" },
  locker:   { icon: LockIcon,          label: "رختکن",           gradient: "from-slate-500/20 to-slate-600/10", iconColor: "text-slate-600 dark:text-slate-400", ring: "ring-slate-500/20" },
  shower:   { icon: ShowerHeadIcon,    label: "دوش",             gradient: "from-cyan-500/20 to-cyan-600/10",   iconColor: "text-cyan-600 dark:text-cyan-400",   ring: "ring-cyan-500/20" },
  cafe:     { icon: CoffeeIcon,        label: "کافه",            gradient: "from-amber-500/20 to-amber-600/10", iconColor: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
  wifi:     { icon: WifiIcon,          label: "وای‌فای",         gradient: "from-violet-500/20 to-violet-600/10",iconColor: "text-violet-600 dark:text-violet-400",ring: "ring-violet-500/20" },
  lighting: { icon: SunIcon,           label: "روشنایی شبانه",   gradient: "from-yellow-500/20 to-yellow-600/10",iconColor: "text-yellow-600 dark:text-yellow-500",ring: "ring-yellow-500/20" },
  shop:     { icon: ShoppingBagIcon,   label: "فروشگاه",         gradient: "from-pink-500/20 to-pink-600/10",   iconColor: "text-pink-600 dark:text-pink-400",   ring: "ring-pink-500/20" },
  coaching: { icon: AwardIcon,         label: "کوچینگ",          gradient: "from-primary/20 to-primary/10",     iconColor: "text-primary",                       ring: "ring-primary/20" },
  firstaid: { icon: HeartPulseIcon,    label: "کمک‌های اولیه",   gradient: "from-red-500/20 to-red-600/10",     iconColor: "text-red-600 dark:text-red-400",     ring: "ring-red-500/20" },
  ac:       { icon: WindIcon,          label: "تهویه مطبوع",     gradient: "from-sky-500/20 to-sky-600/10",     iconColor: "text-sky-600 dark:text-sky-400",     ring: "ring-sky-500/20" },
};

export default function ClubAmenities({ amenities = [] }) {
  if (!amenities.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-foreground text-base">امکانات</h2>
       
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {amenities.map((key, i) => {
          const cfg = AMENITY_CONFIG[key];
          if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }}
              className={`relative flex flex-col items-center gap-2 rounded-2xl p-3 text-center bg-gradient-to-br ${cfg.gradient} ring-1 ${cfg.ring} overflow-hidden`}
            >
              <div className={`w-9 h-9 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center ring-1 ${cfg.ring} shadow-sm`}>
                <Icon className={`w-4.5 h-4.5 ${cfg.iconColor}`} strokeWidth={2} />
              </div>
              <span className="text-[10.5px] text-foreground/80 font-semibold leading-tight">{cfg.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
