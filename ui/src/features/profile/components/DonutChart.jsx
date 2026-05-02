import React from "react";
import { motion } from "framer-motion";

const SIZE = 120;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function Arc({ pct, color, offset, delay }) {
  const dash = (pct / 100) * CIRC;
  return (
    <motion.circle
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={R}
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeDasharray={`${dash} ${CIRC}`}
      strokeDashoffset={-offset}
      initial={{ strokeDasharray: `0 ${CIRC}` }}
      animate={{ strokeDasharray: `${dash} ${CIRC}` }}
      transition={{ duration: 1.1, delay, ease: "easeOut" }}
      transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
    />
  );
}

export default function DonutChart({ wins, losses, total }) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs">
        <span className="text-3xl mb-2">🎮</span>
        هنوز بازی نداشتید
      </div>
    );
  }

  const winPct  = Math.round((wins  / total) * 100);
  const lossPct = 100 - winPct;
  const winDash  = (winPct  / 100) * CIRC;
  const lossDash = (lossPct / 100) * CIRC;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width={SIZE} height={SIZE}>
          {/* Track */}
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="var(--color-muted)" strokeWidth={STROKE} />
          <Arc pct={winPct}  color="#10B981" offset={0}       delay={0.2} />
          <Arc pct={lossPct} color="#EF4444" offset={winDash} delay={0.5} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-foreground">{winPct}%</span>
          <span className="text-[10px] text-muted-foreground">برد</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">برد</p>
            <p className="font-bold text-foreground text-sm">{wins} بازی</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">باخت</p>
            <p className="font-bold text-foreground text-sm">{losses} بازی</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">نامشخص</p>
            <p className="font-bold text-foreground text-sm">{total - wins - losses} بازی</p>
          </div>
        </div>
      </div>
    </div>
  );
}
