import React, { useState, useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";

function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          direction: "rtl",
          fontFamily: "inherit",
          fontSize: "0.875rem",
          fontWeight: "500",
          padding: "12px 16px",
          borderRadius: "14px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.08)",
          maxWidth: "340px",
          lineHeight: "1.5",
        },
        success: {
          style: {
            background: "rgba(22, 163, 74, 0.92)",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#ffffff",
            secondary: "rgba(22, 163, 74, 0.92)",
          },
        },
        error: {
          style: {
            background: "rgba(220, 38, 38, 0.92)",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#ffffff",
            secondary: "rgba(220, 38, 38, 0.92)",
          },
        },
        loading: {
          style: {
            background: "rgba(30, 30, 40, 0.92)",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#2B0FD9",
            secondary: "rgba(30, 30, 40, 0.92)",
          },
        },
      }}
    />
  );
}
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ErrorBoundary } from "react-error-boundary";

import router from "./routers";
import {
  showOverlayLoadingAtom,
  themeAtom,
  showAuthSheetAtom,
  authCallbacksAtom,
  showOnboardingSheetAtom,
  showSplashAtom,
} from "./config/state";
import CheckLogin from "./components/CheckLogin";
import useAuth from "./auth/useAuth";
import storage from "@/auth/storage";
import apiClient from "@/lib/apiClient";
import ErrorFallback from "./components/ErrorFallback";
import AuthBottomSheet from "./components/AuthBottomSheet";
import OnboardingSheet from "./components/OnboardingSheet";
import SplashScreen from "./components/SplashScreen";
import GlobalLoader from "./components/GlobalLoader";

function App() {
  const { setCurrentUser } = useAuth();

  const showOnboarding = useAtomValue(showOnboardingSheetAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useAtom(showSplashAtom);
  const setShowAuthSheet = useSetAtom(showAuthSheetAtom);
  const setAuthCallbacks = useSetAtom(authCallbacksAtom);
  const setShowOnboarding = useSetAtom(showOnboardingSheetAtom);

  const shouldForceOnboarding = (user) => {
    if (!user) return false;
    if (user.isClubOwner) return false;
    const firstName = typeof user.firstName === "string" ? user.firstName.trim() : "";
    const lastName = typeof user.lastName === "string" ? user.lastName.trim() : "";
    return !(firstName && lastName);
  };

  useEffect(() => {
    preload();
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const checkOnboarding = async () => {
    try {
      const { ok, data, status } = await apiClient.get("/users/me");

      if (status === 403 && data?.code === "PROFILE_INCOMPLETE") {
        setShowOnboarding(true);
        return true;
      }

      if (ok && data?.user) {
        setCurrentUser(data.user);
        if (shouldForceOnboarding(data.user)) {
          setShowOnboarding(true);
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const handleProfileIncomplete = () => {
      setShowOnboarding(true);
    };

    window.addEventListener("raqetzone:profile-incomplete", handleProfileIncomplete);
    return () => {
      window.removeEventListener("raqetzone:profile-incomplete", handleProfileIncomplete);
    };
  }, [setShowOnboarding]);

  const preload = async () => {
    // Let invite/join pages bypass auth
    if (window.location.pathname.startsWith("/join/")) {
      setIsReady(true);
      return;
    }

    const token = storage.getToken();
    const user = storage.getUser();

    if (!token || !user) {
      setAuthCallbacks({
        onSuccess: async () => {
          const nextUser = storage.getUser();
          if (nextUser) setCurrentUser(nextUser);

          await checkOnboarding();
          setIsReady(true);
        },
        onError: null,
      });
      setShowAuthSheet(true);
      return;
    }

    setCurrentUser(user);
    await checkOnboarding();
    setIsReady(true);
  };

  const handleError = (error, errorInfo) => {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  };

  const handleReset = () => {
    window.location.reload();
  };

  if (!isReady)
    return (
      <>
        <SplashScreen visible={showSplash} />
        <CheckLogin />
        <AuthBottomSheet />
        <AppToaster />
      </>
    );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      <SplashScreen visible={showSplash} />
      {!showOnboarding && <RouterProvider router={router} />}
      <OnboardingSheet />
      <AppToaster />
      <GlobalLoader />
    </ErrorBoundary>
  );
}

export default App;
