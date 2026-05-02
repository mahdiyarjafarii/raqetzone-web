import React from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { MapPinIcon, CalendarIcon, XIcon, LogOutIcon } from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";

import {
  selectedMatchAtom,
  joinConfirmAtom,
  joinLoadingAtom,
  matchesAtom,
} from "@/store/matchStore";
import { currentUserAtom } from "@/config/state";
import { matchService } from "@/services/matchService";
import TeamSection from "./TeamSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPORT_ICONS = {
  padel: "🏓",
  tennis: "🎾",
  squash: "🟡",
  badminton: "🏸",
  "ping-pong": "🏓",
};

function formatDateFull(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MatchDetailSheet() {
  const [selectedMatch, setSelectedMatch] = useAtom(selectedMatchAtom);
  const [joinLoading, setJoinLoading] = useAtom(joinLoadingAtom);
  const setJoinConfirm = useSetAtom(joinConfirmAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [, setMatches] = useAtom(matchesAtom);

  const match = selectedMatch;
  const currentUserId = currentUser?.id;
  const isUserInMatch =
    match && [...match.teamA, ...match.teamB].some((p) => p.userId === currentUserId);

  const handleLeave = async () => {
    if (!match) return;
    setJoinLoading(true);
    try {
      const res = await matchService.leaveMatch(match.id);
      if (res.ok) {
        const updated = res.data.match;
        setSelectedMatch(updated);
        setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        toast.success("از مسابقه خارج شدید");
      } else {
        toast.error(res.data?.message ?? "خطا در خروج از مسابقه");
      }
    } finally {
      setJoinLoading(false);
    }
  };

  if (!match) return null;

  const sportIcon = SPORT_ICONS[match.sportType] ?? "🏅";

  return (
    <BottomSheet
      open={!!selectedMatch}
      onDismiss={() => setSelectedMatch(null)}
      snapPoints={({ maxHeight }) => [maxHeight * 0.85]}
    >
      <div className="min-h-[60vh] bg-background text-foreground">
        {/* Header */}
        <div className="relative px-5 pt-2 pb-4 border-b border-border">
          <button
            onClick={() => setSelectedMatch(null)}
            className="absolute left-4 top-2 p-1.5 rounded-full bg-muted hover:bg-accent transition-colors"
          >
            <XIcon className="w-4 h-4 text-foreground" />
          </button>

          <div className="text-center pt-1">
            <span className="text-4xl block mb-2">{sportIcon}</span>
            <h2 className="text-lg font-bold text-foreground">{match.title}</h2>
            <span className="text-muted-foreground text-xs capitalize">{match.sportType}</span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span>{formatDateFull(match.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPinIcon className="w-4 h-4 shrink-0" />
              <span>{match.courtName ? `${match.courtName} — ` : ""}{match.location}</span>
            </div>
          </div>

          <div className="mt-3">
            <span
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium border",
                match.status === "open"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : match.status === "full"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {match.status === "open" ? "باز" : match.status === "full" ? "پر شد" : match.status}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="px-5 py-5 grid grid-cols-2 gap-3">
          {["A", "B"].map((team) => (
            <TeamSection
              key={team}
              team={team}
              players={team === "A" ? match.teamA : match.teamB}
              teamSize={match.teamSize}
              canJoin={match.status === "open" && !isUserInMatch}
              currentUserId={currentUserId}
              onJoin={(t) => setJoinConfirm({ matchId: match.id, team: t })}
              isLoading={joinLoading}
            />
          ))}
        </div>

        {/* Leave */}
        {isUserInMatch && (
          <div className="px-5 pb-6">
            <Button
              onClick={handleLeave}
              disabled={joinLoading}
              variant="outline"
              size="sm"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <LogOutIcon className="w-4 h-4 mr-2" />
              {joinLoading ? "در حال خروج..." : "خروج از مسابقه"}
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
