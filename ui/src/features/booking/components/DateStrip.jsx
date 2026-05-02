import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const WEEKDAY_FA = ["یک", "دو", "سه", "چهار", "پنج", "جمعه", "شنبه"];
const MONTH_FA = [
  "فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور",
  "مهر","آبان","آذر","دی","بهمن","اسفند",
];

function formatDayFa(dateStr) {
  const d = new Date(dateStr);
  const dayNum = d.getDate().toLocaleString("fa-IR");
  const dayName = WEEKDAY_FA[d.getDay()];
  return { dayNum, dayName };
}

export default function DateStrip({ selectedDate, onSelect, daysAhead = 14 }) {
  const today = new Date().toISOString().split("T")[0];
  const dates = Array.from({ length: daysAhead }, (_, i) => addDays(today, i));
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedDate]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2"
    >
      {dates.map((date) => {
        const { dayNum, dayName } = formatDayFa(date);
        const isSelected = date === selectedDate;
        const isToday = date === today;

        return (
          <motion.button
            key={date}
            ref={isSelected ? selectedRef : null}
            whileTap={{ scale: 0.94 }}
            onClick={() => onSelect(date)}
            className={cn(
              "flex flex-col items-center justify-center shrink-0 w-12 h-16 rounded-xl border transition-all text-xs font-medium",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card text-foreground border-border hover:bg-muted"
            )}
          >
            <span className={cn("text-[10px]", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {dayName}
            </span>
            <span className="text-base font-bold leading-tight">{dayNum}</span>
            {isToday && (
              <span className={cn("text-[8px] font-semibold", isSelected ? "text-primary-foreground/70" : "text-primary")}>
                امروز
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
