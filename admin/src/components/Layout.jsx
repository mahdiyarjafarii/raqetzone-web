import React, { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { MenuIcon } from "lucide-react";
import Sidebar from "./Sidebar";
import { adminTokenAtom } from "@/store/authStore";

const TEHRAN_TIME_ZONE = "Asia/Tehran";

const PAGE_TITLES = {
  "/":            "داشبورد",
  "/bookings":    "رزروها",
  "/clubs":       "باشگاه ها",
  "/courts":      "مدیریت زمین‌ها",
  "/discounts":   "تخفیف‌ها",
  "/tournaments": "تورنومنت‌ها",
  "/analytics":   "آنالیتیکس",
  "/users":       "کاربران",
};

export default function Layout() {
  const token    = useAtomValue(adminTokenAtom);
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/clubs/") ? "مدیریت زمین‌های باشگاه" : "پنل مدیریت باشگاه");

  return (
    <div className="flex h-dvh lg:h-screen bg-background overflow-hidden" dir="rtl">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
              aria-label="بستن منو"
            />
            <motion.div
              initial={{ x: 280, opacity: 0.85 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 280, opacity: 0.85 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-y-0 right-0 z-50 max-w-[85vw]"
            >
              <Sidebar className="w-[min(19rem,85vw)] h-dvh shadow-xl" onNavigate={() => setIsMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 shrink-0 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-3 sm:px-6 gap-3">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background text-foreground"
            aria-label="تغییر وضعیت منو"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-sm sm:text-base font-bold text-foreground truncate">{pageTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full whitespace-nowrap">
              {new Date().toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE, weekday:"short", month:"long", day:"numeric" })}
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
