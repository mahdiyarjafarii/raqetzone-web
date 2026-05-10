import React, { useState, useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LoadingOverlay } from "@achmadk/react-loading-overlay";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ErrorBoundary } from "react-error-boundary";

import router from "./routers";
import {
  showOverlayLoadingAtom,
  themeAtom,
  showAuthSheetAtom,
  authCallbacksAtom,
  showOnboardingSheetAtom,
} from "./config/state";
import CheckLogin from "./components/CheckLogin";
import useAuth from "./auth/useAuth";
import storage from "@/auth/storage";
import apiClient from "@/lib/apiClient";
import ErrorFallback from "./components/ErrorFallback";
import AuthBottomSheet from "./components/AuthBottomSheet";
import OnboardingSheet from "./components/OnboardingSheet";

function App() {
  const { setCurrentUser } = useAuth();

  const showOverlayLoading = useAtomValue(showOverlayLoadingAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [isReady, setIsReady] = useState(false);
  const setShowAuthSheet = useSetAtom(showAuthSheetAtom);
  const setAuthCallbacks = useSetAtom(authCallbacksAtom);
  const setShowOnboarding = useSetAtom(showOnboardingSheetAtom);

  useEffect(() => { preload(); }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const checkOnboarding = async () => {
    try {
      const { ok, data } = await apiClient.get("/users/me");
      if (ok && data?.user && !data.user.name) setShowOnboarding(true);
    } catch {}
  };

  const preload = async () => {
    const token = storage.getToken();
    const user = storage.getUser();

    if (!token || !user) {
      setAuthCallbacks({
        onSuccess: () => {
          const nextUser = storage.getUser();
          if (nextUser) setCurrentUser(nextUser);
          setIsReady(true);
          checkOnboarding();
        },
        onError: null,
      });
      setShowAuthSheet(true);
      return;
    }

    setCurrentUser(user);
    setIsReady(true);
    checkOnboarding();
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
        <CheckLogin />
        <AuthBottomSheet />
        <Toaster />
      </>
    );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      <RouterProvider router={router} />
      <OnboardingSheet />
      <Toaster />
      <LoadingOverlay
        spinner
        active={showOverlayLoading}
        text="لطفا منتظر باشید..."
        fadeSpeed={200}
        styles={{
          overlay: (base) => ({
            ...base,
            position: "fixed",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 99999999,
          }),
          spinner: (base) => ({
            ...base,
            marginBottom: "20px",
          }),
        }}
      />
    </ErrorBoundary>
  );
}

export default App;
