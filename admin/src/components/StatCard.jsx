import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StatCard({ label, value, sub, icon: Icon, color = "text-primary", bg = "bg-primary/10", trend, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.055, duration: 0.3 }}
      className="group rounded-2xl border border-border bg-card p-5 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", bg)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="text-2xl font-black text-foreground mt-0.5 leading-none tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      </div>
      {trend != null && (
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5", trend >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400")}>
          {trend >= 0 ? "+" : ""}{trend}%
        </span>
      )}
    </motion.div>
  );
}
