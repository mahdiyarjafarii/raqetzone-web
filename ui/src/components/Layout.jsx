import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAtom, useSetAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightIcon,
  GemIcon,
  ShoppingCart,
  User,
  Gem,
  LogOutIcon,
  Sun,
  Moon,
  CalendarCheckIcon,
  WalletIcon,
  SparklesIcon,
  GiftIcon,
} from "lucide-react";

import NotificationBell from "@/features/notifications/components/NotificationBell";
import UserAvatar from "@/components/ui/UserAvatar";

import OneTimeCheck from "./OneTimeCheck";
import PricingSheet from "./PricingSheet";
import ReachLimitPricingSheet from "./ReachLimitPricingSheet";
import SpinWheelModal from "./SpinWheelModal";
import SpinWheelSection from "./SpinWheelSection";
import { spinWheelService } from "@/services/spinWheelService";
import { LimelightNav } from "@/components/ui/shadcn-io/limelight-nav";
import {
  showPricingSheetAtom,
  pricingSheetTriggerSourceAtom,
  showOverlayLoadingAtom,
  gemHintAtom,
  usageHintAtom,
  themeAtom,
  showFeatureTourAtom,
  featureTourStepAtom,
} from "@/config/state";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useAuth from "@/auth/useAuth";
import HintAlertModal from "./HintAlertModal";
import FeatureTour from "./FeatureTour";
import { fetchBatchPreferences } from "@/hooks/useUserPreference";
import apiClient from "@/lib/apiClient";
import PREFERENCE_KEYS from "@/config/preferenceKeys";
import authStorage from "@/auth/storage";
import useSocket from "@/hooks/useSocket";
import { walletService } from "@/features/wallet/walletService";

let prevPathname = "";

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logOut } = useAuth();
  useSocket();
  const [gemHint, setGemHintAtom] = useAtom(gemHintAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const setUsageHintAtom = useSetAtom(usageHintAtom);
  const setShowFeatureTour = useSetAtom(showFeatureTourAtom);
  const [, setFeatureTourStep] = useAtom(featureTourStepAtom);
  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  const [, setShowPricingSheet] = useAtom(showPricingSheetAtom);
  const [, setPricingSheetTriggerSource] = useAtom(
    pricingSheetTriggerSourceAtom
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showPrizesSheet, setShowPrizesSheet] = useState(false);
  const [spinMilestones, setSpinMilestones] = useState([]);
  const [spinReason, setSpinReason] = useState(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [wallet, setWallet] = useState(null);

  // Load preferences from backend on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const token = authStorage.getToken();
      if (!token || !currentUser) {
        setPreferencesLoaded(true);
        return;
      }

      try {
        const prefs = await fetchBatchPreferences([
          PREFERENCE_KEYS.USAGE_HINT,
          PREFERENCE_KEYS.GEM_HINT,
        ]);

        setUsageHintAtom(prefs[PREFERENCE_KEYS.USAGE_HINT] ?? true);
        setGemHintAtom(prefs[PREFERENCE_KEYS.GEM_HINT] ?? true);

        if (!currentUser.hasSeenTour) {
          setFeatureTourStep(0);
          setShowFeatureTour(true);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  // Helper functions to update preferences both locally and on backend
  const setGemHint = async (value) => {
    setGemHintAtom(value);
    const token = authStorage.getToken();
    if (token && currentUser) {
      try {
        await apiClient.post(`/preference/${PREFERENCE_KEYS.GEM_HINT}`, {
          value,
        });
      } catch (error) {
        console.error("Error saving gem hint preference:", error);
      }
    }
  };

  useEffect(() => {
    prevPathname = location.pathname;
  }, [location.pathname]);

  const isDirectMessagePage = /^\/messages\/[^/]+$/.test(location.pathname);
  const isChatPage = location.pathname.startsWith("/chat") || isDirectMessagePage;
  const isVideoGeneratePage = location.pathname === "/video-generate";
  const isImageGeneratePage = location.pathname === "/image-generate";
  const isClubDetailPage = /^\/clubs\/[^/]+$/.test(location.pathname);

  const formatNumber = (num) => {
    if (num == null || num === undefined) return num;
    const numValue = typeof num === "object" ? num?.remaining : num;
    if (numValue == null) return numValue;
    return numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    const refreshWallet = () => walletService.getWallet().then((res) => {
      if (alive && res.ok) setWallet(res.data.wallet);
    });
    const handleWalletUpdated = (event) => {
      if (event.detail) setWallet(event.detail);
      else refreshWallet();
    };
    refreshWallet();
    window.addEventListener("wallet:updated", handleWalletUpdated);
    return () => {
      alive = false;
      window.removeEventListener("wallet:updated", handleWalletUpdated);
    };
  }, [currentUser]);
  const loadSpinMilestones = () => {
    if (!currentUser) return;
    spinWheelService.getEligibility().then((res) => {
      if (res.ok) setSpinMilestones(res.data.milestones ?? []);
    });
  };

  const handleOpenPrizes = () => {
    loadSpinMilestones();
    setShowPrizesSheet(true);
    setIsDropdownOpen(false);
  };

  const handleOpenSpin = () => {
    const eligible = spinMilestones.find((m) => m.canSpin);
    if (eligible) {
      setSpinReason(eligible.key);
      setShowPrizesSheet(false);
      setShowSpinWheel(true);
    }
  };

  const handleSpinClose = () => {
    setShowSpinWheel(false);
    loadSpinMilestones();
    setShowPrizesSheet(true);
  };

  const handleBack = () => {
    setShowOverlayLoading(true);
    navigate(-1);
    setTimeout(() => setShowOverlayLoading(false), 150);
  };

  
  window.handleBack = handleBack;

  const shouldShowCredits = (() => {
    if (!currentUser?.subscriptionType) return false;
    if (currentUser?.subscriptionEndDate) {
      const endDate = new Date(currentUser.subscriptionEndDate);
      const now = new Date();
      if (endDate <= now) return false;
    }

    return true;
  })();
  // Wait for preferences to load
  if (!preferencesLoaded) return null;

  return (
    <div
      id="wrapper"
      className="flex relative flex-col w-full h-full items-center bg-background overflow-hidden"
    >
      {isDropdownOpen && gemHint && (
        <div className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 pointer-events-none">
          <div className="absolute top-[90px] left-4 z-50 cursor-pointer border text-white bg-primary px-3 py-2.5 min-h-[44px] w-[174px] h-[44px] flex items-center justify-start gap-2 pointer-events-auto">
            <GemIcon size={18} className="text-white!" />
            <span className="text-sm font-medium">
              اعتبار: {formatNumber(currentUser?.credits)} جم
            </span>
          </div>

          <div className="p-4 absolute space-y-2 top-36 left-12 z-50 w-80 border rounded-xl bg-white dark:bg-black text-black dark:text-white shadow-xl pointer-events-auto">
            <p className="text-base">اعتبار (جم💎)</p>
            <p className="text-sm">
              شما ۳۰ جم💎 هدیه ثبت‌نام دریافت کردید. جم‌ها اعتبار استفاده از
              مدل‌های هوش مصنوعی هستند. برای جم بیشتر، می‌توانید{" "}
              <span
                className="text-primary cursor-pointer"
                onClick={() => {
                  setGemHint(false);
                  setPricingSheetTriggerSource("gem_hint_popup");
                  setShowPricingSheet(true);
                }}
              >
                اشتراک پلاس
              </span>{" "}
              بگیرید و از مزایای ویژه‌ی آن استفاده کنید‌.
            </p>{" "}
            <div className="flex items-center justify-end">
              <button
                onClick={() => setGemHint(false)}
                className="text-sm text border dark:border-white rounded-md px-2 py-1 cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {!isDirectMessagePage && <header className="fixed top-0 left-0 right-0 z-1 flex justify-center bg-background ">
        <div className="w-full md:w-120 flex items-center justify-between p-2 border-b border-border">
          <div className="flex items-center gap-2">
         
            <Link to="/" className="flex items-center gap-2">
              <img
                src={
                  import.meta.env.VITE_IS_TEST ? "/logo-test.png" : "/logo.png"
                }
                alt="logo"
                className="w-8 h-8"
              />
              <h1 className="font-bold">
                رکت زون  {import.meta.env.VITE_IS_TEST ? "تست" : ""}
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {shouldShowCredits && (
              <Link
                to="/profile"
                className="flex items-center justify-center gap-1 px-2 py-1 rounded-md cursor-pointer  text-sm font-medium bg-[#E5E5E5] text-[#737373] dark:bg-[#525252] dark:text-[#D4D4D4]"
              >
                <Gem size={13} />
                {formatNumber(currentUser?.credits)}
              </Link>
            )}

            <NotificationBell />

            <DropdownMenu
              dir="rtl"
              open={isDropdownOpen}
              onOpenChange={(open) => {
                setIsDropdownOpen(open);
                if (!open) setGemHint(false);
              }}
            >
              <DropdownMenuTrigger className="outline-none">
                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-border active:ring-primary transition-all">
                  <UserAvatar
                    image={currentUser?.image}
                    name={currentUser?.name ?? currentUser?.phone}
                    className="w-9 h-9 rounded-full bg-muted text-sm text-foreground"
                    fallbackClassName="w-9 h-9 rounded-full bg-primary/10 text-primary text-sm"
                  />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="transform translate-x-3 min-w-[200px] z-10 rounded-[20px] border border-black/[0.06] dark:border-white/10 bg-white/95 dark:bg-card/95 p-1.5 shadow-2xl shadow-black/15 backdrop-blur-xl">
                <DropdownMenuLabel className="py-2 text-xs text-center font-bold text-muted-foreground">
                  {currentUser?.phone}
                </DropdownMenuLabel>
                <div className="relative mb-1.5 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-l from-primary/12 to-[#ef1871]/8 px-3 py-2">
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <WalletIcon size={17} className="text-primary" />
                      <span className="text-xs font-bold text-muted-foreground">کیف پول</span>
                    </div>
                    <span className="text-sm font-black text-foreground">
                      {formatNumber(wallet?.balance ?? 0)}
                    </span>
                  </div>
                </div>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setTheme(theme === "dark" ? "light" : "dark");
                  }}
                  className={cn(
                    "rounded-2xl px-3 py-2.5 min-h-[44px] flex items-center justify-between cursor-pointer border transition-all",
                    theme === "dark"
                      ? "border-indigo-400/25 bg-gradient-to-l from-indigo-500/20 to-slate-900/10"
                      : "border-amber-400/25 bg-gradient-to-l from-amber-300/25 to-orange-200/20"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shadow-inner",
                      theme === "dark" ? "bg-slate-950 text-indigo-200" : "bg-white text-amber-500"
                    )}>
                      {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
                    </div>
                    <span className="text-sm font-black">تم</span>
                  </div>

                  <div className={cn(
                    "relative h-7 w-13 rounded-full p-1 transition-colors shadow-inner",
                    theme === "dark" ? "bg-slate-950" : "bg-white"
                  )}>
                    <motion.span
                      layout
                      className={cn(
                        "absolute top-1 h-5 w-5 rounded-full flex items-center justify-center shadow-lg",
                        theme === "dark" ? "right-7 bg-indigo-500 text-white" : "right-1 bg-amber-400 text-white"
                      )}
                    >
                      {theme === "dark" ? <Moon size={11} /> : <Sun size={11} />}
                    </motion.span>
                  </div>
                </DropdownMenuItem>
            
                <DropdownMenuItem
                  onClick={() => {
                    setPricingSheetTriggerSource("user_dropdown_menu");
                    setShowPricingSheet(true);
                  }}
                  className="rounded-2xl px-3 py-2.5 min-h-[44px] cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#ef1871]/10 text-[#ef1871] flex items-center justify-center">
                    <ShoppingCart size={16} />
                  </div>
                  <span className="text-sm font-bold">رکت‌زون پلاس</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={handleOpenPrizes}
                  className="rounded-2xl px-3 py-2.5 min-h-[44px] cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <GiftIcon size={16} />
                  </div>
                  <span className="text-sm font-bold">جایزه‌ها</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    logOut();
                  }}
                  className="rounded-2xl px-3 py-3 min-h-[50px] cursor-pointer flex items-center gap-2.5 text-destructive focus:text-destructive"
                >
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <LogOutIcon size={18} />
                  </div>
                  <span className="text-sm font-bold">خروج از رکت زون</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>}

      {!isDirectMessagePage && <div className="h-12 w-screen md:w-120" />}

      <main
        className={cn(
          "w-full md:w-120 px-2 flex-1",
          !isChatPage &&
            !isVideoGeneratePage &&
            !isImageGeneratePage &&
            "overflow-y-auto no-scrollbar",
          (isVideoGeneratePage || isImageGeneratePage) && "overflow-y-auto"
        )}
      >
        <Outlet />
      </main>

      <OneTimeCheck />
      <PricingSheet />
      <ReachLimitPricingSheet />
      <HintAlertModal />
      <FeatureTour />

      {/* ── Spin Wheel ── */}
      <SpinWheelModal open={showSpinWheel} onClose={handleSpinClose} reason={spinReason} />
      <AnimatePresence>
        {showPrizesSheet && (
          <motion.div
            key="prizes-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPrizesSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-sm bg-background rounded-t-3xl p-5 pb-10"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <h3 className="text-base font-black mb-4">جایزه‌های من : </h3>
              <SpinWheelSection milestones={spinMilestones} onOpenSpin={handleOpenSpin} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isChatPage && !isImageGeneratePage && !isVideoGeneratePage && !isClubDetailPage && (
        <>
          <footer className="fixed bottom-0 left-0 right-0 flex justify-center z-50 bg-background overflow-visible">
            <LimelightNav />
          </footer>

          <div className="h-16 w-screen md:w-120" />
        </>
      )}

      {/* Booking FAB — only on home page */}
      {location.pathname === "/" && (
        <Link
          to="/clubs"
          className="fixed bottom-20 left-4 z-1 flex items-center gap-2 bg-primary text-primary-foreground pl-3 pr-4 py-3 rounded-full shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          style={{ width: "fit-content" }}
        >
          <CalendarCheckIcon className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">رزرو زمین</span>
        </Link>
      )}
    </div>
  );
}

export default Layout;
