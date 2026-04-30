import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAtom, useSetAtom } from "jotai";
import {
  ArrowRightIcon,
  SparklesIcon,
  GemIcon,
  SettingsIcon,
  ShoppingCart,
  User,
  Gem,
  LogOutIcon,
  Sun,
  Moon,
} from "lucide-react";

import OneTimeCheck from "./OneTimeCheck";
import PricingSheet from "./PricingSheet";
import ReachLimitPricingSheet from "./ReachLimitPricingSheet";
import { LimelightNav } from "@/components/ui/shadcn-io/limelight-nav";
import {
  showPricingSheetAtom,
  pricingSheetTriggerSourceAtom,
  showReachLimitPricingSheetAtom,
  reachLimitPricingSheetTriggerSourceAtom,
  hasTitleReachLimitPricingSheetAtom,
  showOverlayLoadingAtom,
  gemHintAtom,
  showOnboardingAtom,
  usageHintAtom,
  themeAtom,
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
import Onboarding from "./Onboariding";
import { fetchBatchPreferences } from "@/hooks/useUserPreference";
import apiClient from "@/lib/apiClient";
import PREFERENCE_KEYS from "@/config/preferenceKeys";
import authStorage from "@/auth/storage";

let prevPathname = "";

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logOut } = useAuth();
  const [gemHint, setGemHintAtom] = useAtom(gemHintAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const setUsageHintAtom = useSetAtom(usageHintAtom);
  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  const [, setShowPricingSheet] = useAtom(showPricingSheetAtom);
  const [, setPricingSheetTriggerSource] = useAtom(
    pricingSheetTriggerSourceAtom
  );
  const [, setShowReachLimitPricingSheet] = useAtom(
    showReachLimitPricingSheetAtom
  );
  const [, setReachLimitTriggerSource] = useAtom(
    reachLimitPricingSheetTriggerSourceAtom
  );
  const [, setHasTitleReachLimitPricingSheet] = useAtom(
    hasTitleReachLimitPricingSheetAtom
  );
  const [showOnboarding, setShowOnboardingAtom] = useAtom(showOnboardingAtom);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

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
          PREFERENCE_KEYS.SHOW_ONBOARDING,
          PREFERENCE_KEYS.USAGE_HINT,
          PREFERENCE_KEYS.GEM_HINT,
        ]);

        setShowOnboardingAtom(prefs[PREFERENCE_KEYS.SHOW_ONBOARDING] ?? true);
        setUsageHintAtom(prefs[PREFERENCE_KEYS.USAGE_HINT] ?? true);
        setGemHintAtom(prefs[PREFERENCE_KEYS.GEM_HINT] ?? true);
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

  const setShowOnboarding = async (value) => {
    setShowOnboardingAtom(value);
    const token = authStorage.getToken();
    if (token && currentUser) {
      try {
        await apiClient.post(`/preference/${PREFERENCE_KEYS.SHOW_ONBOARDING}`, {
          value,
        });
      } catch (error) {
        console.error("Error saving onboarding preference:", error);
      }
    }
  };

  useEffect(() => {
    prevPathname = location.pathname;
  }, [location.pathname]);

  const isChatPage = location.pathname.startsWith("/chat");
  const isVideoGeneratePage = location.pathname === "/video-generate";
  const isImageGeneratePage = location.pathname === "/image-generate";

  const shouldShowSubscriptionButton = (() => {
    // if (!isHomePage) return false;
    if (currentUser?.subscriptionType) return false;
    if (currentUser?.subscriptionEndDate) {
      const endDate = new Date(currentUser.subscriptionEndDate);
      const now = new Date();
      if (endDate > now) return false;
    }

    return true;
  })();

  const formatNumber = (num) => {
    if (num == null || num === undefined) return num;
    const numValue = typeof num === "object" ? num?.remaining : num;
    if (numValue == null) return numValue;
    return numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
  // Wait for preferences to load before showing onboarding
  if (!preferencesLoaded) return null;
  if (showOnboarding)
    return <Onboarding setShowOnboarding={setShowOnboarding} />;

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

      <header className="fixed top-0 left-0 right-0 z-1 flex justify-center bg-background ">
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
            {shouldShowSubscriptionButton && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer border-2 text-sm font-medium"
                style={{
                  backgroundColor: "rgba(234, 0, 105, 0.1)",
                  borderColor: "rgba(234, 0, 105, 1)",
                  color: "rgba(234, 0, 105, 1)",
                }}
                onClick={() => {
                  setReachLimitTriggerSource("header_subscribe_button");
                  setShowReachLimitPricingSheet(true);
                  setHasTitleReachLimitPricingSheet(false);
                }}
              >
                <SparklesIcon size={16} />
                خرید اشتراک
              </div>
            )}

            {shouldShowCredits && (
              <Link
                to="/profile"
                className="flex items-center justify-center gap-1 px-2 py-1 rounded-md cursor-pointer  text-sm font-medium bg-[#E5E5E5] text-[#737373] dark:bg-[#525252] dark:text-[#D4D4D4]"
              >
                <Gem size={13} />
                {formatNumber(currentUser?.credits)}
              </Link>
            )}

            <DropdownMenu
              dir="rtl"
              open={isDropdownOpen}
              onOpenChange={(open) => {
                setIsDropdownOpen(open);
                if (!open) setGemHint(false);
              }}
            >
              <DropdownMenuTrigger>
                <User size={26} />
              </DropdownMenuTrigger>

              <DropdownMenuContent className="transform translate-x-3 min-w-[180px] z-10">
                <DropdownMenuLabel className="py-2 text-sm text-center">
                  {currentUser?.phone}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/profile");
                    setIsDropdownOpen(false);
                  }}
                  className="cursor-pointer border text-primary! bg-primary/10! px-3 py-2.5 min-h-[44px]"
                >
                  <GemIcon size={18} className="text-primary!" />
                  <span className="text-sm font-medium">
                    اعتبار: {formatNumber(currentUser?.credits)} جم
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setPricingSheetTriggerSource("user_dropdown_menu");
                    setShowPricingSheet(true);
                  }}
                  className="px-3 py-2.5 min-h-[44px]"
                >
                  <ShoppingCart size={18} />
                  <span className="text-sm">خرید اشتراک</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/profile");
                    setIsDropdownOpen(false);
                  }}
                  className="px-3 py-2.5 min-h-[44px]"
                >
                  <SettingsIcon size={18} />
                  <span className="text-sm">تنظیمات</span>
                </DropdownMenuItem>{" "}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setTheme(theme === "dark" ? "light" : "dark");
                    setIsDropdownOpen(false);
                  }}
                  className="px-3 py-2.5 min-h-[44px] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    <span className="text-sm">حالت تیره</span>
                  </div>

                  <button
                    type="button"
                    aria-label="toggle theme"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTheme(theme === "dark" ? "light" : "dark");
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      theme === "dark" ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform",
                        theme === "dark" ? "translate-x-4" : "translate-x-1"
                      )}
                    />
                  </button>
                </DropdownMenuItem>
                <hr />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();

                    logOut();
                  }}
                  className="px-3 py-2.5 min-h-[44px] cursor-pointer flex items-center gap-2"
                >
                  <LogOutIcon size={18} />
                  <span className="text-sm ">خروج از رکت زون</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="h-12 w-screen md:w-120" />

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

      {!isChatPage && !isImageGeneratePage && !isVideoGeneratePage && (
        <>
          <footer className="fixed bottom-0 left-0 right-0 flex justify-center z-1 bg-background">
            <LimelightNav />
          </footer>

          <div className="h-16 w-screen md:w-120" />
        </>
      )}
    </div>
  );
}

export default Layout;
