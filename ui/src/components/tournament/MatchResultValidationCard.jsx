import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2Icon, ShieldAlertIcon, TrophyIcon } from "lucide-react";
import { matchService } from "@/services/matchService";
import { cn } from "@/lib/utils";

function parseSetsInput(value) {
  if (typeof value !== "string") return null;
  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  const parsed = [];
  for (const item of items) {
    const match = item.match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
    if (!match) return null;
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0 || a === b) return null;
    parsed.push({ a, b });
  }

  return parsed.length ? parsed : null;
}

function scoreSummary(sets = []) {
  if (!Array.isArray(sets) || sets.length === 0) return "-";
  return sets.map((set) => `${set.a}-${set.b}`).join(" , ");
}

export default function MatchResultValidationCard({
  match,
  currentUserId,
  isUserInMatch,
  onMatchUpdated,
}) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);
  const [payload, setPayload] = useState(null);
  const [scoreInput, setScoreInput] = useState("");

  const status = payload?.result?.status ?? null;
  const winnerTeam = payload?.result?.winnerTeam ?? null;
  const awaitingVotes = payload?.awaitingVotes ?? [];

  const statusText = useMemo(() => {
    if (status === "confirmed") return "نتیجه نهایی شد";
    if (status === "disputed") return "اختلاف در نتیجه";
    if (status === "pending") return "در انتظار تایید بازیکنان";
    return "نتیجه‌ای ثبت نشده";
  }, [status]);

  const load = async () => {
    if (!match?.id) return;
    setLoading(true);
    const res = await matchService.getMatchResult(match.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.data?.message ?? "خطا در دریافت نتیجه مسابقه");
      return;
    }

    setPayload(res.data);

    if (res.data?.result?.scoreSets?.length) {
      setScoreInput(res.data.result.scoreSets.map((set) => `${set.a}-${set.b}`).join(", "));
    }
  };

  useEffect(() => {
    load();
  }, [match?.id]);

  const submit = async () => {
    const sets = parseSetsInput(scoreInput);
    if (!sets) {
      toast.error("فرمت نتیجه نامعتبر است. مثال: 6-4, 3-6, 10-8");
      return;
    }

    setSubmitting(true);
    const res = await matchService.submitMatchResult(match.id, sets);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.data?.message ?? "خطا در ثبت نتیجه");
      return;
    }

    setPayload(res.data);
    toast.success("نتیجه ثبت شد");

    if (onMatchUpdated) {
      await onMatchUpdated();
    }
  };

  const vote = async (nextVote) => {
    setVoting(true);
    const res = await matchService.voteMatchResult(match.id, nextVote);
    setVoting(false);

    if (!res.ok) {
      toast.error(res.data?.message ?? "خطا در ثبت رای");
      return;
    }

    setPayload(res.data);
    toast.success(nextVote === "confirm" ? "نتیجه را تایید کردی" : "اختلاف نتیجه ثبت شد");

    if (onMatchUpdated) {
      await onMatchUpdated();
    }
  };

  if (!match?.awaitingResult && match?.status !== "completed") return null;

  return (
    <div className="mx-5 mb-3 rounded-2xl border border-border bg-muted/35 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <TrophyIcon className="w-3.5 h-3.5 text-violet-500" />
            ثبت و تایید نتیجه بازی
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {loading ? "در حال بارگذاری..." : statusText}
          </p>
        </div>

        {winnerTeam && (
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            تیم برنده: {winnerTeam === "A" ? "آبی" : "بنفش"}
          </span>
        )}
      </div>

      {payload?.result?.scoreSets?.length > 0 && (
        <div className="text-xs text-foreground" dir="ltr">
          نتیجه: {scoreSummary(payload.result.scoreSets)}
        </div>
      )}

      {(payload?.canSubmit || isUserInMatch) && match.status !== "cancelled" && status !== "confirmed" && (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground block">ثبت نتیجه (ست‌ها)</label>
          <input
            value={scoreInput}
            onChange={(event) => setScoreInput(event.target.value)}
            placeholder="6-4, 3-6, 10-8"
            dir="ltr"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          />

          {payload?.canSubmit && (
            <button
              onClick={submit}
              disabled={submitting || voting}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
            >
              {submitting ? "در حال ثبت..." : "ثبت/به‌روزرسانی نتیجه"}
            </button>
          )}
        </div>
      )}

      {payload?.canVote && status !== "confirmed" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => vote("confirm")}
            disabled={voting || submitting}
            className="py-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1">
              <CheckCircle2Icon className="w-3.5 h-3.5" />
              تایید نتیجه
            </span>
          </button>
          <button
            onClick={() => vote("reject")}
            disabled={voting || submitting}
            className="py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1">
              <ShieldAlertIcon className="w-3.5 h-3.5" />
              اعلام اختلاف
            </span>
          </button>
        </div>
      )}

      {Array.isArray(awaitingVotes) && awaitingVotes.length > 0 && status !== "confirmed" && (
        <div className={cn(
          "text-[11px] rounded-xl border px-2.5 py-2",
          status === "disputed"
            ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-400"
            : "border-border bg-background/80 text-muted-foreground"
        )}>
          {status === "disputed"
            ? "نتیجه اختلاف دارد. یکی از بازیکنان باید نتیجه صحیح را دوباره ثبت کند."
            : `در انتظار تایید ${awaitingVotes.length} بازیکن`}
        </div>
      )}
    </div>
  );
}
