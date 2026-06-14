import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BottomSheet } from "react-spring-bottom-sheet";
import { useNavigate } from "react-router-dom";
import { XIcon } from "lucide-react";

import { gameService } from "@/services/gameService";

import "react-spring-bottom-sheet/dist/style.css";

export default function TennisDuelPage() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [overview, setOverview] = useState({
    game: { key: "tennis-duel", winScore: 7, rewardToman: 30000 },
    dailyRewardClaimed: false,
    bestScoreToday: 0,
  });
  const [scoreState, setScoreState] = useState({ leftScore: 0, rightScore: 0 });

  const rewardText = useMemo(() => {
    if (overview.dailyRewardClaimed) return "جایزه امروز این بازی دریافت شده";
    const rewardToman = Number(overview.game?.rewardToman ?? 30000);
    const rewardLabel = new Intl.NumberFormat("fa-IR").format(rewardToman);
    return `اگر بردی ${rewardLabel} تومان به کیف پولت اضافه میشه`;
  }, [overview]);

  useEffect(() => {
    let mounted = true;

    async function loadOverview() {
      setLoading(true);
      const overviewRes = await gameService.getTennisDuelOverview();

      if (!mounted) return;

      if (!overviewRes.ok) {
        toast.error(overviewRes.data?.message || "خطا در دریافت وضعیت بازی");
      } else {
        setOverview(overviewRes.data);
      }

      setLoading(false);
    }

    loadOverview();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStartGame = async () => {
    if (startingGame || gameStarted) return;

    setStartingGame(true);
    const startRes = await gameService.startTennisDuel();
    setStartingGame(false);

    if (!startRes.ok) {
      toast.error(startRes.data?.message || "خطا در شروع بازی");
      return;
    }

    setSessionId(startRes.data?.session?.id || null);
    setSubmitted(false);
    setScoreState({ leftScore: 0, rightScore: 0 });
    setGameStarted(true);
  };

  useEffect(() => {
    async function onMessage(event) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const type = event?.data?.type;

      if (type === "TENNIS_DUEL_SCORE") {
        setScoreState({
          leftScore: Number(event.data.leftScore ?? 0),
          rightScore: Number(event.data.rightScore ?? 0),
        });
      }

      if (type === "TENNIS_DUEL_WIN") {
        if (!sessionId || submitted) return;

        setSubmitted(true);
        const submitRes = await gameService.submitTennisDuel(sessionId, {
          score: Number(event.data.score ?? 0),
          won: true,
        });

        if (!submitRes.ok) {
          setSubmitted(false);
          toast.error(submitRes.data?.message || "ثبت نتیجه بازی ناموفق بود");
          return;
        }

        if (submitRes.data?.rewarded) {
          const rewardAmount = Number(submitRes.data.walletAmountAdded ?? overview.game?.rewardToman ?? 30000);
          const rewardLabel = new Intl.NumberFormat("fa-IR").format(rewardAmount);
          toast.success(`تبریک! ${rewardLabel} تومان به کیف پولت اضافه شد 🎉`);
        } else {
          toast("برد ثبت شد؛ جایزه امروز قبلاً دریافت شده", { icon: "ℹ️" });
        }

        const overviewRes = await gameService.getTennisDuelOverview();
        if (overviewRes.ok) setOverview(overviewRes.data);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sessionId, submitted]);

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-foreground">
      <BottomSheet
        open={open}
        onDismiss={() => {
          setOpen(false);
          navigate("/");
        }}
        defaultSnap={({ maxHeight }) => maxHeight * 0.84}
        snapPoints={({ maxHeight }) => [maxHeight * 0.84, maxHeight * 0.92]}
        blocking={true}
        scrollLocking={true}
        className="bottom-sheet"
      >
        <div className="px-4 pb-5 pt-3 bg-[#fbfaf8] dark:bg-background">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/");
              }}
              className="h-8 w-8 rounded-full border border-border/70 bg-white text-muted-foreground flex items-center justify-center"
              aria-label="بستن"
            >
              <XIcon className="h-4 w-4" />
            </button>
            <p className="text-base font-black">Tennis Duel</p>
            <div className="w-8" />
          </div>

          <div className="rounded-2xl border bg-white p-2.5 shadow-sm mb-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">جایزه برد</span>
              <span className="font-bold text-emerald-600">{rewardText}</span>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>شما: {scoreState.leftScore}</span>
              <span>کامپیوتر: {scoreState.rightScore}</span>
            </div>

            <p className="mt-1.5 text-[11px] text-amber-700 font-semibold">
              شرط جایزه: اگر ببری و حداقل {overview.game?.winScore ?? 7} امتیاز بگیری، جایزه روزانه به کیف پولت اضافه میشه.
            </p>
          </div>

          {!gameStarted && (
            <button
              onClick={handleStartGame}
              disabled={startingGame || loading}
              className="w-full h-10 rounded-xl bg-sky-500 text-white text-sm font-bold shadow-sm disabled:opacity-60 mb-2"
            >
              {startingGame ? "در حال شروع..." : "شروع بازی"}
            </button>
          )}

          <div
            className="w-full overflow-hidden rounded-3xl border bg-white shadow-sm"
            style={{
              height: "min(46vh, calc(100vw * 0.5))",
              minHeight: "210px",
            }}
          >
            {!gameStarted ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                برای شروع، دکمه "شروع بازی" را بزن
              </div>
            ) : loading ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                در حال آماده‌سازی بازی...
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                title="Tennis Duel"
                src="/tennis-duel.html"
                className="h-full w-full border-0"
                allow="autoplay"
              />
            )}
          </div>

          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            روی گوشی سوایپ بالا/پایین؛ روی دسکتاپ کلیدهای بالا/پایین.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}
