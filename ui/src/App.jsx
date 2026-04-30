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
} from "./config/state";
import CheckLogin from "./components/CheckLogin";
import useAuth from "./auth/useAuth";
import storage from "@/auth/storage";
import ErrorFallback from "./components/ErrorFallback";
import AuthBottomSheet from "./components/AuthBottomSheet";

function App() {
  const { setCurrentUser, handleLoginSuccess } = useAuth();

  const showOverlayLoading = useAtomValue(showOverlayLoadingAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [isReady, setIsReady] = useState(false);
  const setShowAuthSheet = useSetAtom(showAuthSheetAtom);
  const setAuthCallbacks = useSetAtom(authCallbacksAtom);

  useEffect(() => {
    preload();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const preload = async () => {
    let currentAiModel = localStorage.getItem("raqetzone-ai-model");
    if (currentAiModel) {
      try {
        currentAiModel = JSON.parse(currentAiModel);
        if (currentAiModel.slug === "maya")
          localStorage.removeItem("raqetzone-ai-model");
      } catch (error) {
        console.log("error in currentAiModel:", error);
      }
    }

    const token = storage.getToken();
    const user = storage.getUser();

    if (!token || !user) {
      setAuthCallbacks({
        onSuccess: async () => {
          await handleLoginSuccess();
          const nextUser = storage.getUser();
          if (nextUser) setCurrentUser(nextUser);
          setIsReady(true);
        },
        onError: null,
      });
      setShowAuthSheet(true);
      return;
    }

    setCurrentUser(user);
    setIsReady(true);
  };

  const handleError = (error, errorInfo) => {
    // Log error to console for debugging
    console.error("Error caught by ErrorBoundary:", error, errorInfo);

    // You can also send error to your logging service here
    // Example: logErrorToService(error, errorInfo);
  };

  const handleReset = () => {
    // Optional: Clear any problematic state
    // You can add custom reset logic here
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

      <Toaster />
      <AuthBottomSheet />
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
