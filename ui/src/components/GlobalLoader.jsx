import React, { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useAtomValue } from "jotai";
import { showOverlayLoadingAtom, showSplashAtom } from "@/config/state";
import { loadingBus } from "@/lib/loadingBus";

import tennisBallJson from "@/assets/lottie/Tennis-Ball.json";

export default function GlobalLoader() {
  const manualActive = useAtomValue(showOverlayLoadingAtom);
  const splashVisible = useAtomValue(showSplashAtom);
  const [busActive, setBusActive] = useState(false);

  useEffect(() => {
    return loadingBus.subscribe((loading) => setBusActive(loading));
  }, []);

  const active = !splashVisible && (manualActive || busActive);

  return (
    <div
      className="fixed inset-0 z-[99999998] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{
        transition: "opacity 0.25s ease, visibility 0.25s ease",
        opacity: active ? 1 : 0,
        visibility: active ? "visible" : "hidden",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <DotLottieReact
        data={tennisBallJson}
        loop
        autoplay
        style={{ width: 300, height: 300 }}
      />
      <p className="mt-2 text-sm font-bold text-white/90">لطفاً منتظر باشید...</p>
    </div>
  );
}
