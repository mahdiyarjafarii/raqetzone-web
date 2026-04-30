import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { useRouteError } from "react-router-dom";

export default function ErrorFallback({
  error: propError,
  resetErrorBoundary,
}) {
  // Try to get error from React Router if available
  const routeError = useRouteError();
  const error = propError || routeError;

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleReset = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-destructive/10 mb-8"
        >
          <AlertCircle className="w-12 h-12 text-destructive" />
        </motion.div>

        <motion.h1
          className="text-4xl md:text-5xl font-bold text-foreground mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          خطایی رخ داده است!
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          متاسفانه مشکلی در اجرای برنامه پیش آمده است.
        </motion.p>

        {error?.message && (
          <motion.div
            className="bg-muted/50 border border-border rounded-lg p-4 mb-8 text-right"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <p className="text-sm text-muted-foreground font-mono wrap-break-word">
              {error.message}
            </p>
          </motion.div>
        )}

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.button
            onClick={handleReset}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-full transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-5 h-5" />
            <span>تلاش دوباره</span>
          </motion.button>

          <motion.button
            onClick={handleGoHome}
            className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-3 px-6 rounded-full transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home className="w-5 h-5" />
            <span>بازگشت به صفحه اصلی</span>
          </motion.button>
        </motion.div>

        <motion.div
          className="mt-12 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <p>اگر این مشکل همچنان ادامه داشت، لطفا با پشتیبانی تماس بگیرید.</p>
        </motion.div>
      </div>
    </div>
  );
}
