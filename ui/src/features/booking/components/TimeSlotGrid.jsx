import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCurrentMinutesInTehran, getTodayDateKeyInTehran } from "@/lib/timezone";

function isPastSlot(dateStr, startTime) {
  const today = getTodayDateKeyInTehran();
  if (dateStr !== today) return false;
  const [h, m] = startTime.split(":").map(Number);
  const nowMinutes = getCurrentMinutesInTehran();
  return h * 60 + m <= nowMinutes;
}

export default function TimeSlotGrid({ slots, selectedSlot, onSelect, loading, selectedDate }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        هیچ اسلاتی برای این روز وجود ندارد
      </div>
    );
  }

  const visibleSlots = slots.filter(slot => !isPastSlot(selectedDate, slot.start));

  if (visibleSlots.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        هیچ اسلاتی برای این روز وجود ندارد
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 px-4 pb-4">
      {visibleSlots.map((slot, i) => {
        const isSelected =
          selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
        const isBooked = slot.isBooked;

        return (
          <motion.button
            key={slot.start}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            whileTap={!isBooked ? { scale: 0.95 } : {}}
            disabled={isBooked}
            onClick={() => !isBooked && onSelect(slot)}
            className={cn(
              "flex flex-col items-center justify-center h-14 rounded-xl border text-xs font-medium transition-all",
              isBooked
                ? "bg-muted/50 border-border text-muted-foreground/40 cursor-not-allowed line-through"
                : isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <span className="font-bold text-sm">{slot.start}</span>
            <span className={cn("text-[10px]", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
              تا {slot.end}
            </span>
            {isBooked && (
              <span className="text-[9px] text-muted-foreground/50 mt-0.5">رزرو شده</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
