import React from "react";
import { motion } from "framer-motion";

const CHART_H = 72;
const BAR_W = 20;
const GAP = 8;

const WEEK_LABELS = ["ه۸", "ه۷", "ه۶", "ه۵", "ه۴", "ه۳", "ه۲", "این"];

export default function WeeklyBarsChart({ weeklyActivity = [] }) {
  const data = weeklyActivity.slice(-8);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartW = data.length * (BAR_W + GAP) - GAP;

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <svg
        width={chartW}
        height={CHART_H + 24}
        className="block mx-auto"
        style={{ minWidth: chartW }}
      >
        {data.map((d, i) => {
          const barH = Math.max((d.count / maxCount) * CHART_H, d.count === 0 ? 4 : 6);
          const x = i * (BAR_W + GAP);
          const y = CHART_H - barH;
          const isLast = i === data.length - 1;

          return (
            <g key={i}>
              {/* Track */}
              <rect x={x} y={0} width={BAR_W} height={CHART_H} rx={BAR_W / 2} fill="var(--color-muted)" />
              {/* Bar */}
              <motion.rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={BAR_W / 2}
                fill={isLast ? "var(--color-primary)" : d.count > 0 ? "var(--color-primary)" : "var(--color-muted)"}
                opacity={isLast ? 1 : d.count > 0 ? 0.55 : 0.3}
                initial={{ height: 0, y: CHART_H }}
                animate={{ height: barH, y }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
              />
              {/* Count label above bar */}
              {d.count > 0 && (
                <motion.text
                  x={x + BAR_W / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--color-muted-foreground)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.06 + 0.6 }}
                >
                  {d.count}
                </motion.text>
              )}
              {/* Week label */}
              <text
                x={x + BAR_W / 2}
                y={CHART_H + 16}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-muted-foreground)"
              >
                {WEEK_LABELS[i] ?? `ه${i + 1}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
