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
    color: "bg-primary/10 text-primary",
    border: "border-primary/20",
  },
  {
    icon: SwordsIcon,
    label: "پیوستن به بازی",
    sub: "بازی‌های باز",
    href: "/tournament",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    icon: ClipboardListIcon,
    label: "رزروهای من",
    sub: "وضعیت رزرو",
    href: "/mybooking",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
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
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border bg-card ${action.border} active:scale-95 transition-transform`}
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-foreground leading-tight">{action.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{action.sub}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
