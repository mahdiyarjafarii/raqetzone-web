import React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import { adminTokenAtom } from "@/store/authStore";

const PAGE_TITLES = {
  "/":            "داشبورد",
  "/bookings":    "مدیریت رزروها",
  "/courts":      "مدیریت زمین‌ها",
  "/discounts":   "مدیریت تخفیف‌ها",
  "/tournaments": "تورنومنت‌ها",
  "/analytics":   "آنالیتیکس",
  "/users":       "کاربران",
};

export default function Layout() {
  const token    = useAtomValue(adminTokenAtom);
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace />;

  const pageTitle = PAGE_TITLES[location.pathname] ?? "پنل مدیریت";

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 shrink-0 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 gap-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{pageTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {new Date().toLocaleDateString("fa-IR", { weekday:"short", month:"long", day:"numeric" })}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
