import React, { useEffect, useState } from "react";
import tennisSvg from "@/assets/svg/tennis-loading.svg";

export default function SplashScreen({ visible }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 900);
    const t3 = setTimeout(() => setStep(3), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [visible]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background"
      style={{
        transition: "opacity 0.6s ease, visibility 0.6s ease",
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
      }}
      dir="rtl"
    >
      <div
        style={{
          transition: "opacity 0.6s ease, transform 0.6s ease",
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? "translateY(0)" : "translateY(16px)",
        }}
      >
        <img src={tennisSvg} alt="" className="w-56 h-56" />
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <h1
          className="text-4xl font-black text-foreground tracking-tight"
          style={{
            transition: "opacity 0.5s ease, transform 0.5s ease",
            opacity: step >= 2 ? 1 : 0,
            transform: step >= 2 ? "translateY(0)" : "translateY(12px)",
          }}
        >
          رکت‌زون
        </h1>

        <div
          className="flex items-center gap-2.5 px-2"
          style={{
            transition: "opacity 0.5s ease, transform 0.5s ease",
            opacity: step >= 3 ? 1 : 0,
            transform: step >= 3 ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-border" />
          <span className="text-sm font-semibold text-foreground/80 tracking-wide whitespace-nowrap">
            جامع‌ترین پلتفرم هوشمند ورزش‌های راکتی
          </span>
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-border" />
        </div>

        <p
          className="text-xs text-foreground/50 tracking-widest mt-1"
          style={{
            transition: "opacity 0.5s ease",
            opacity: step >= 3 ? 1 : 0,
          }}
        >
          بازی بیرون از زمین شروع میشه
        </p>
      </div>
    </div>
  );
}
