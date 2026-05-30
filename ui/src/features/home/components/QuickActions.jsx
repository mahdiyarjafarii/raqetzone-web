import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2Icon, SwordsIcon, ClipboardListIcon } from "lucide-react";

const ACTIONS = [
  {
    icon: Building2Icon,
    label: "رزرو زمین",
    sub: "انتخاب مجموعه",
    href: "/clubs",
    color: "bg-primary text-primary-foreground shadow-primary/20",
    border: "border-primary/15",
  },
  {
    icon: SwordsIcon,
    label: "پیوستن به بازی",
    sub: "بازی‌های باز",
    href: "/tournament",
    color: "bg-emerald-500 text-white shadow-emerald-500/20",
    border: "border-emerald-500/15",
  },
  {
    icon: ClipboardListIcon,
    label: "رزروهای من",
    sub: "وضعیت رزرو",
    href: "/mybooking",
    color: "bg-amber-500 text-white shadow-amber-500/20",
    border: "border-amber-500/15",
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-2.5 px-4 mb-2">
      {ACTIONS.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.07 }}
        >
          <Link
            to={action.href}
            className={`group relative overflow-hidden flex flex-col items-center gap-2.5 p-3 rounded-[24px] border bg-white/85 dark:bg-card/90 ${action.border} shadow-lg shadow-slate-200/45 dark:shadow-black/10 backdrop-blur-xl active:scale-95 transition-transform`}
          >
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/70 to-transparent dark:from-white/5" />
            <div className={`relative h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <div className="relative text-center">
              <p className="text-xs font-bold text-foreground leading-tight">{action.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">{action.sub}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
