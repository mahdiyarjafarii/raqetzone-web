import { useState, useEffect } from "react";
import { motion } from "motion/react";

const DeepResearchLoading = ({ isMobile }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: "🔍",
      text: "در حال جستجو در وب...",
      subtext: "یافتن منابع مرتبط",
    },
    { icon: "📚", text: "در حال خواندن مقالات...", subtext: "تحلیل محتوا" },
    {
      icon: "🧠",
      text: "در حال پردازش اطلاعات...",
      subtext: "استخراج نکات کلیدی",
    },
    {
      icon: "✨",
      text: "در حال ترکیب نتایج...",
      subtext: "آماده‌سازی پاسخ جامع",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3"
    >
      {/* Main animated container */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-l from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl border border-purple-100 dark:border-purple-800/50">
        {/* Animated icon */}
        <motion.div
          key={currentStep}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl"
        >
          {steps[currentStep].icon}
        </motion.div>{" "}
        {/* Text content */}
        <div className="flex flex-col">
          <motion.span
            key={`text-${currentStep}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium text-purple-700 dark:text-purple-300"
          >
            {steps[currentStep].text}
          </motion.span>
          <motion.span
            key={`subtext-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-xs text-purple-500 dark:text-purple-400"
          >
            {steps[currentStep].subtext}
          </motion.span>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 mr-auto">
          {steps.map((_, idx) => (
            <motion.div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx === currentStep
                  ? "bg-purple-500 dark:bg-purple-400"
                  : "bg-purple-200 dark:bg-purple-700"
              }`}
              animate={idx === currentStep ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          ))}
        </div>
      </div>

      {/* Animated progress bar */}
      <div className="w-full h-1 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-l from-purple-400 via-indigo-500 to-purple-400"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ width: "50%" }}
        />
      </div>

      {/* Info text */}
      {!isMobile && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-slate-500 dark:text-slate-400 text-center"
        >
          تحقیق عمیق ممکن است 1 تا 2 دقیقه برای نتایج جامع زمان ببرد
        </motion.p>
      )}
    </motion.div>
  );
};

export default DeepResearchLoading;
