import "@mertercelik/react-prize-wheel/style.css";

import React, { useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { PrizeWheel } from "@mertercelik/react-prize-wheel";
import { TrophyIcon, CopyIcon, CheckIcon, XIcon } from "lucide-react";
import { spinWheelService } from "@/services/spinWheelService";

const SECTORS = [
  { id: 1, label: "تخفیف ۲۰ هزار تومانی", text: "۲۰K تخفیف",  probability: 35 },
  { id: 2, label: "تخفیف ۵۰ هزار تومانی", text: "۵۰K تخفیف",  probability: 25 },
  { id: 3, label: "تیشرت رکت‌زون",         text: "تیشرت",      probability: 10 },
  { id: 4, label: "یک جلسه رایگان",        text: "جلسه رایگان",probability: 10 },
  { id: 5, label: "یک قهوه رایگان",        text: "قهوه رایگان",probability: 20 },
];

export default function SpinWheelModal({ open, onClose, reason }) {
  const wheelRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState(null);
  const [code, setCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSpin = useCallback(() => {
    if (spinning || prize) return;
    setSpinning(true);
    setError(null);
    wheelRef.current?.spin();
  }, [spinning, prize]);

  const handleSpinEnd = useCallback(async (sector) => {
    const res = await spinWheelService.spin(reason, sector.label);

    setSpinning(false);
    if (!res.ok) {
      setError(res.data?.message ?? "خطایی رخ داد");
      return;
    }

    setPrize(res.data.prize);
    setCode(res.data.code);
    setExpiresAt(res.data.expiresAt);

    const end = Date.now() + 2200;
    const colors = ["#2b0fd9", "#ef1871", "#ffd700", "#ffffff", "#00e5ff"];
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [reason]);

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatExpiry = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="spin-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex flex-col items-center justify-start bg-black/70 backdrop-blur-sm overflow-y-auto py-6 px-4"
        onClick={(e) => e.target === e.currentTarget && !spinning && onClose()}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative w-full max-w-sm bg-gradient-to-b from-[#1a0a3c] to-[#0d1f3c] rounded-3xl shadow-2xl p-6 text-white"
          dir="rtl"
        >
          {!spinning && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}

          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-bold mb-3">
              <TrophyIcon className="w-4 h-4 text-yellow-400" />
              جایزه برگزاری اولین مسابقه
            </div>
            <h2 className="text-xl font-black">چرخ شانس رو بچرخون!</h2>
            <p className="text-white/60 text-xs mt-1">یه بار فرصت داری — از جایزه‌ات استفاده کن</p>
          </div>

          <div className="flex justify-center">
            <PrizeWheel
              ref={wheelRef}
              sectors={SECTORS}
              onSpinEnd={handleSpinEnd}
              duration={4}
              minSpins={5}
              maxSpins={8}
              wheelColors={["#2b0fd9", "#ef1871"]}
              frameColor="#ffd700"
              middleColor="#ffd700"
              middleDotColor="#b8860b"
              winIndicatorColor="#ffd700"
              winIndicatorDotColor="#b8860b"
              sticksColor="#ffd700"
              borderColor="#ffd700"
              borderWidth={2}
              textColor="#ffffff"
              textFontSize={26}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mt-3">{error}</p>
          )}

          <AnimatePresence>
            {prize ? (
              <motion.div
                key="prize-result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 space-y-3"
              >
                <div className="bg-gradient-to-r from-yellow-400/20 to-yellow-600/10 border border-yellow-400/30 rounded-2xl p-4 text-center">
                  <p className="text-yellow-300 text-xs font-semibold mb-1">جایزه شما</p>
                  <p className="text-white text-lg font-black">{prize.label}</p>
                </div>

                {code ? (
                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-white/60 text-xs mb-2 text-center">کد تخفیف شما</p>
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 justify-between">
                      <span className="font-mono font-bold text-base tracking-widest text-white">{code}</span>
                      <button
                        onClick={copyCode}
                        className="text-white/70 hover:text-white transition-colors flex-shrink-0"
                      >
                        {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    {expiresAt && (
                      <p className="text-white/40 text-xs text-center mt-2">
                        تا {formatExpiry(expiresAt)} معتبر است
                      </p>
                    )}
                    <p className="text-white/50 text-xs text-center mt-2">
                      این کد را هنگام رزرو زمین وارد کنید
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/10 rounded-2xl p-4 text-center">
                    <p className="text-white/70 text-sm leading-relaxed">
                      تیم رکت‌زون با شما تماس می‌گیرد و جایزه‌ات رو بهت می‌رسونه 🎁
                    </p>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full bg-white/10 hover:bg-white/20 rounded-xl py-3 font-bold text-sm transition-colors"
                >
                  بستن
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="spin-btn"
                onClick={handleSpin}
                disabled={spinning}
                className="mt-5 w-full bg-gradient-to-r from-[#2b0fd9] to-[#ef1871] hover:opacity-90 disabled:opacity-50 rounded-xl py-3.5 font-black text-base transition-opacity shadow-lg shadow-pink-500/20"
              >
                {spinning ? "در حال چرخش..." : "بچرخون!"}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
