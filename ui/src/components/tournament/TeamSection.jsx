import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import PlayerSlot from "./PlayerSlot";
import { Button } from "@/components/ui/button";

export default function TeamSection({
  team,
  players,
  teamSize,
  canJoin,
  currentUserId,
  onJoin,
  isLoading,
}) {
  const isFull = players.length >= teamSize;
  const isUserHere = players.some((p) => p.userId === currentUserId);
  const slots = Array.from({ length: teamSize }, (_, i) => players[i] ?? null);

  const isA = team === "A";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-4 border border-border bg-card",
        isA ? "border-t-2 border-t-blue-500" : "border-t-2 border-t-violet-500"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-widest",
            isA ? "text-blue-500" : "text-violet-500"
          )}
        >
          Team {team}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {players.length}/{teamSize}
        </span>
      </div>

      <div className="flex gap-3 justify-center my-2">
        {slots.map((player, i) => (
          <PlayerSlot key={i} player={player} size="md" />
        ))}
      </div>

      {!isUserHere && !isFull && canJoin && (
        <Button
          onClick={() => onJoin(team)}
          disabled={isLoading}
          size="sm"
          className={cn(
            "w-full mt-3 text-xs font-semibold rounded-xl transition-all",
            isA
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-violet-500 hover:bg-violet-600 text-white"
          )}
        >
          {isLoading ? "در حال پیوستن..." : `پیوستن به تیم ${team}`}
        </Button>
      )}

      {isUserHere && (
        <div className="mt-3 text-center text-xs text-muted-foreground font-medium">
          ✓ شما در این تیم هستید
        </div>
      )}

      {isFull && !isUserHere && (
        <div className="mt-3 text-center text-xs text-muted-foreground">تیم پر است</div>
      )}
    </motion.div>
  );
}
