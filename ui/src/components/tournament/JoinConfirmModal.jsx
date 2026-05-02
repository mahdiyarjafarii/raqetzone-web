import React from "react";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { joinConfirmAtom, joinLoadingAtom, selectedMatchAtom, matchesAtom } from "@/store/matchStore";
import { matchService } from "@/services/matchService";

export default function JoinConfirmModal() {
  const [joinConfirm, setJoinConfirm] = useAtom(joinConfirmAtom);
  const [joinLoading, setJoinLoading] = useAtom(joinLoadingAtom);
  const setSelectedMatch = useSetAtom(selectedMatchAtom);
  const setMatches = useSetAtom(matchesAtom);

  const handleConfirm = async () => {
    if (!joinConfirm) return;
    const { matchId, team } = joinConfirm;
    setJoinLoading(true);
    try {
      const res = await matchService.joinMatch(matchId, team);
      if (res.ok) {
        const updated = res.data.match;
        setSelectedMatch(updated);
        setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        toast.success(`به تیم ${team} پیوستید! 🎉`);
        setJoinConfirm(null);
      } else {
        toast.error(res.data?.message ?? "خطا در پیوستن به مسابقه");
      }
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <AlertDialog open={!!joinConfirm} onOpenChange={(v) => !v && setJoinConfirm(null)}>
      <AlertDialogContent className="max-w-xs mx-auto rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
            پیوستن به تیم {joinConfirm?.team}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm">
            آیا مطمئن هستید که می‌خواهید به این مسابقه بپیوندید؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:space-x-0">
          <AlertDialogCancel
            disabled={joinLoading}
            className="flex-1 rounded-xl"
          >
            انصراف
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={joinLoading}
            className="flex-1 rounded-xl bg-primary text-primary-foreground"
          >
            {joinLoading ? "..." : "بله، بپیوند!"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
