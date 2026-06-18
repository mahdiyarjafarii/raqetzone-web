import "react-spring-bottom-sheet/dist/style.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  PencilIcon, CameraIcon, ChevronRightIcon,
  TrendingUpIcon, TrendingDownIcon, MinusIcon,
  GemIcon, ChevronDownIcon, ChevronUpIcon,
  MessageCircleIcon, WalletIcon, PlusIcon, ClipboardListIcon,
} from "lucide-react";

import useAuth from "@/auth/useAuth";
import apiClient from "@/lib/apiClient";
import { showPricingSheetAtom, pricingSheetTriggerSourceAtom, currentUserAtom } from "@/config/state";
import { useProfileData } from "@/features/profile/hooks/useProfileData";
import { profileService } from "@/features/profile/services/profileService";
import { rankingService } from "@/services/rankingService";
import EditProfileSheet from "@/features/profile/components/EditProfileSheet";
import RecentMatchesList from "@/features/profile/components/RecentMatchesList";
import { walletService } from "@/features/wallet/walletService";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

const SKILL_CONFIG = {
  beginner:     { label: "مبتدی",    color: "bg-emerald-500/15 text-emerald-600" },
  intermediate: { label: "متوسط",    color: "bg-blue-500/15 text-blue-600" },
  advanced:     { label: "پیشرفته",  color: "bg-violet-500/15 text-violet-600" },
  pro:          { label: "حرفه‌ای",  color: "bg-amber-500/15 text-amber-600" },
};
const SPORT_ICON = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };
const RANKING_SPORT_OPTIONS = [
  { value: "padel", label: "پدل", icon: "🥎" },
  { value: "tennis", label: "تنیس", icon: "🎾" },
];
const PLAN_NAMES = { basic: "پلاس", premium: "پریمیوم", pro: "حرفه‌ای" };
const PERIOD_LABELS = { monthly: "۱ ماهه", quarterly: "۳ ماهه", halfYearly: "۶ ماهه", yearly: "۱۲ ماهه" };
const STATUS_LABEL = { pending: "در انتظار", completed: "موفق", failed: "ناموفق" };
const STATUS_CLS = {
  pending:   "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  failed:    "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};
const fmt = (v) => v == null ? "-" : new Intl.NumberFormat("fa-IR").format(v);
const WALLET_TOPUP_AMOUNTS = [100000, 300000, 500000, 1000000];
const fmtDate = (v) => {
  if (!v) return "-";
  try { return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(v)); }
  catch { return "-"; }
};

// ─── sub-components ─────────────────────────────────────────────────────────

// ─── main ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { currentUser, getUserImage } = useAuth();
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const setShowPricingSheet = useSetAtom(showPricingSheetAtom);
  const setPricingTrigger = useSetAtom(pricingSheetTriggerSourceAtom);

  const { data: profileData, loading, setData } = useProfileData();
  const [editOpen, setEditOpen] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [ranking, setRanking] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingSport, setRankingSport] = useState("padel");
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState(300000);
  const [topupLoading, setTopupLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    setPaymentsLoading(true);
    apiClient.get("/payment/history").then(({ ok, data }) => {
      if (!alive) return;
      if (ok) setPayments(data?.payments ?? []);
      setPaymentsLoading(false);
    });
    return () => { alive = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    setRankingLoading(true);
    rankingService
      .getLeaderboard({ limit: 1, offset: 0, sport: rankingSport })
      .then((res) => {
        if (!alive) return;
        if (res.ok) {
          setRanking({
            rank: res.data?.currentUserRank ?? null,
            ...(res.data?.currentUserSummary ?? {}),
          });
        }
      })
      .finally(() => {
        if (alive) setRankingLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [currentUser, rankingSport]);

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    setWalletLoading(true);
    walletService.getWallet()
      .then((res) => {
        if (alive && res.ok) setWallet(res.data?.wallet ?? null);
      })
      .finally(() => {
        if (alive) setWalletLoading(false);
      });
    return () => { alive = false; };
  }, [currentUser]);

  const hasEverPurchased = useMemo(() => payments.some((p) => p.status === "completed"), [payments]);
  const lastCompleted = useMemo(() => payments.find((p) => p.status === "completed"), [payments]);

  const handleImageUpload = async (file) => {
    setImageUploading(true);
    setImageUploadProgress(0);
    try {
      const res = await profileService.uploadImage(file, {
        onProgress: (percent) => {
          setImageUploadProgress(percent);
        },
      });
      if (res.ok && res.data?.user) {
        const updatedUser = res.data.user;
        setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
        setData((prev) => prev ? { ...prev, user: { ...prev.user, ...updatedUser } } : prev);
        setImageVersion(Date.now());
        toast.success("عکس پروفایل به‌روز شد");
      } else {
        toast.error(res.data?.message ?? "خطا در آپلود عکس");
      }
    } finally {
      setImageUploading(false);
      setImageUploadProgress(0);
    }
  };

  const handleProfileSaved = (updatedUser) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
    setData((prev) => prev ? { ...prev, user: { ...prev.user, ...updatedUser } } : prev);
  };

  const handleTopup = async () => {
    toast.error("شارژ کیف پول به‌زودی فعال می‌شود");
  };

  const user = profileData?.user ?? currentUser;
  const skill = SKILL_CONFIG[user?.skillLevel] ?? SKILL_CONFIG.beginner;
  const displayedPayments = showAllPayments ? payments : payments.slice(0, 3);
  const trendMeta = useMemo(() => {
    const trend = ranking?.trend;
    const delta = Number(ranking?.delta ?? 0);
    if (trend === "up") {
      return {
        text: `+${fmt(Math.abs(delta))} نسبت به ۷ روز قبل`,
        className: "text-emerald-600 dark:text-emerald-400",
        icon: TrendingUpIcon,
      };
    }
    if (trend === "down") {
      return {
        text: `-${fmt(Math.abs(delta))} نسبت به ۷ روز قبل`,
        className: "text-rose-600 dark:text-rose-400",
        icon: TrendingDownIcon,
      };
    }
    return {
      text: "بدون تغییر نسبت به ۷ روز قبل",
      className: "text-muted-foreground",
      icon: MinusIcon,
    };
  }, [ranking]);

  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-background text-foreground pb-28">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative px-4 pt-4 pb-5">
        <div
          className="absolute inset-x-0 top-0 h-64 pointer-events-none opacity-80"
          style={{ background: `radial-gradient(circle at 70% 0%, ${profileData?.level?.rank?.gradient?.[0] ?? "#6366f1"}22, transparent 38%), radial-gradient(circle at 20% 20%, ${profileData?.level?.rank?.gradient?.[1] ?? "#8b5cf6"}18, transparent 34%)` }}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] border border-white/80 dark:border-white/10 bg-white/85 dark:bg-card/80 shadow-xl shadow-slate-200/60 dark:shadow-black/20 backdrop-blur-xl"
        >
          <div
            className="absolute inset-x-0 top-0 h-28 opacity-90"
            style={{ background: `linear-gradient(135deg, ${profileData?.level?.rank?.gradient?.[0] ?? "#6366f1"}18, ${profileData?.level?.rank?.gradient?.[1] ?? "#8b5cf6"}10)` }}
          />
          <button
            onClick={() => setEditOpen(true)}
            className="absolute top-5 left-5 z-10 w-10 h-10 rounded-2xl bg-white/80 dark:bg-white/10 border border-white/70 dark:border-white/10 flex items-center justify-center shadow-sm backdrop-blur-md"
          >
            <PencilIcon className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="relative px-5 pt-11 pb-5">
            <div className="relative w-fit mx-auto mb-4">
              {loading ? (
                <div className="w-28 h-28 rounded-[34px] bg-muted animate-pulse" />
              ) : (
                <>
                  <div
                    className="w-28 h-28 rounded-[34px] shadow-xl shadow-slate-300/60 dark:shadow-black/30"
                    style={user?.isCoach ? {
                      padding: "3px",
                      background: "linear-gradient(135deg, #f59e0b, #fde68a, #f59e0b)",
                      boxShadow: "0 0 18px rgba(251,191,36,0.6)",
                    } : {}}
                  >
                    <motion.img
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      src={`${getUserImage(user?.image)}?v=${imageVersion}`}
                      alt={user?.name}
                      className="w-full h-full rounded-[32px] object-cover border-4 border-white dark:border-background"
                    />
                  </div>
                  {user?.isCoach && (
                    <span className="absolute -top-2.5 -right-2.5 px-2.5 py-1 rounded-full bg-amber-400 text-white text-[10px] font-black shadow-lg whitespace-nowrap z-10">
                      مربی ✦
                    </span>
                  )}
                </>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={imageUploading}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 border-2 border-white dark:border-background"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,image/avif,image/bmp,image/tiff"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) handleImageUpload(f);
                }}
              />
              {imageUploading && (
                <div className="absolute -bottom-7 left-1/2 w-28 -translate-x-1/2 rounded-full bg-muted p-0.5">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${imageUploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="space-y-2 flex flex-col items-center">
                <div className="h-7 w-32 rounded-xl bg-muted animate-pulse" />
                <div className="h-6 w-28 rounded-xl bg-muted animate-pulse" />
              </div>
            ) : (
              <div className="text-center space-y-3">
                <h1 className="text-3xl font-black text-foreground tracking-tight">{user?.name ?? user?.phone ?? "بازیکن"}</h1>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className={cn("text-xs px-3.5 py-1.5 rounded-full font-bold shadow-sm", skill.color)}>
                    {skill.label}
                  </span>
                  {user?.favoriteSport && (
                    <span className="text-xs px-3.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/10 text-muted-foreground font-bold">
                      {SPORT_ICON[user.favoriteSport]} {user.favoriteSport}
                    </span>
                  )}
                </div>
                {user?.bio && (
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{user.bio}</p>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>

      {user?.isCoach && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
          className="mx-4 mt-3"
        >
          <Link
            to="/coach/management"
            className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-l from-sky-600 to-primary px-4 py-3.5 shadow-lg shadow-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <ClipboardListIcon className="w-5 h-5 text-white" />
              </div>
              <div dir="rtl">
                <p className="text-sm font-black text-white">پنل مربی</p>
                <p className="text-[11px] text-white/70">مدیریت کلاس‌ها و جلسات خصوصی</p>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-white/70 shrink-0" />
          </Link>
        </motion.div>
      )}

      {/* ── Ranking & points ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="mt-5 px-4"
      >
        <div className="rounded-[26px] bg-white/90 dark:bg-card border border-black/[0.06] dark:border-border overflow-hidden shadow-lg shadow-slate-200/50 dark:shadow-black/10">
          <div className="px-4 py-3 border-b border-black/[0.06] dark:border-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <h3 className="text-sm font-black text-foreground truncate">رنک و امتیاز شما</h3>
                <span className="shrink-0 text-[11px] text-muted-foreground font-bold">
                  {RANKING_SPORT_OPTIONS.find((s) => s.value === rankingSport)?.icon} {RANKING_SPORT_OPTIONS.find((s) => s.value === rankingSport)?.label}
                </span>
              </div>
              <Link to="/leaderboard" className="shrink-0 text-xs text-primary font-bold flex items-center gap-0.5">
                لیدربورد <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex items-center justify-center sm:justify-start">
              <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background/70 px-1 py-1 overflow-x-auto no-scrollbar">
                {RANKING_SPORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRankingSport(option.value)}
                    className={cn(
                      "shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold transition-colors",
                      rankingSport === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/8 px-3 py-3">
              <p className="text-[11px] text-muted-foreground">رتبه فعلی</p>
              <p className="text-2xl font-black text-primary mt-1">
                {rankingLoading ? "..." : ranking?.rank ? `#${fmt(ranking.rank)}` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-3 py-3">
              <p className="text-[11px] text-muted-foreground">امتیاز کل</p>
              <p className="text-2xl font-black text-foreground mt-1">
                {rankingLoading ? "..." : fmt(ranking?.points ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-3 py-3">
              <p className="text-[11px] text-muted-foreground">امتیاز مچ</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
                {rankingLoading ? "..." : fmt(ranking?.matchPoints ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-3 py-3">
              <p className="text-[11px] text-muted-foreground">امتیاز تورنومنت</p>
              <p className="text-lg font-black text-violet-600 dark:text-violet-400 mt-1">
                {rankingLoading ? "..." : fmt(ranking?.tournamentPoints ?? 0)}
              </p>
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="rounded-2xl border border-border bg-muted/40 px-3 py-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">ترند هفتگی امتیاز</p>
              {rankingLoading ? (
                <span className="text-[11px] font-bold text-muted-foreground">...</span>
              ) : (
                <span className={cn("text-[11px] font-bold inline-flex items-center gap-1", trendMeta.className)}>
                  <trendMeta.icon className="w-3.5 h-3.5" />
                  {trendMeta.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Wallet ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-5 px-4"
      >
        <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/12 via-white to-[#ef1871]/8 dark:via-card dark:to-primary/5 p-4 shadow-lg shadow-slate-200/50 dark:shadow-black/10">
          <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
                <WalletIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">کیف پول رکت‌زون</p>
                <p className="text-2xl font-black text-foreground mt-1">
                  {walletLoading ? "..." : fmt(wallet?.balance ?? 0)}
                  <span className="text-xs font-bold text-muted-foreground mr-1">تومان</span>
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            {WALLET_TOPUP_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTopupAmount(amount)}
                className={cn(
                  "rounded-2xl border px-3 py-2.5 text-sm font-black transition-all",
                  Number(topupAmount) === amount
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "border-border bg-white/70 dark:bg-background/70 text-foreground"
                )}
              >
                {fmt(amount)}
              </button>
            ))}
          </div>

          <div className="relative mt-3 flex gap-2">
            <input
              type="number"
              min={10000}
              step={10000}
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              className="h-12 flex-1 rounded-2xl border border-border bg-white/80 dark:bg-background/80 px-3 text-sm font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              placeholder="مبلغ شارژ"
            />
            <button
              type="button"
              onClick={handleTopup}
              disabled={topupLoading}
              className="h-12 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-60 flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              {topupLoading ? "..." : "شارژ"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Messages ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="mt-5 px-4"
      >
        <Link
          to="/messages"
          className="flex items-center justify-between bg-white/90 dark:bg-card border border-black/[0.06] dark:border-border rounded-2xl px-4 py-3.5 shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ef1871]/10 flex items-center justify-center">
              <MessageCircleIcon className="w-4 h-4 text-[#ef1871]" />
            </div>
            <span className="font-bold text-sm text-foreground">پیام‌های من</span>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
        </Link>
      </motion.div>

      {/* ── Recent matches ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mt-7 px-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-foreground">بازی‌های اخیر</h2>
          <Link to="/tournament" className="text-xs text-primary font-bold flex items-center gap-0.5">
            همه <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <RecentMatchesList matches={profileData?.recentMatches ?? []} loading={loading} />
      </motion.div>

      {/* ── Subscription ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34 }}
        className="mt-7 px-4 space-y-3"
      >
        <h2 className="text-base font-black text-foreground">اشتراک</h2>

        {paymentsLoading ? (
          <div className="h-28 rounded-2xl bg-muted animate-pulse" />
        ) : hasEverPurchased ? (
          <>
            {/* active plan card */}
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">
                    اشتراک {PLAN_NAMES[currentUser?.subscriptionType] ?? currentUser?.subscriptionType}
                    {lastCompleted?.period ? ` · ${PERIOD_LABELS[lastCompleted.period] ?? lastCompleted.period}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">انقضا: {fmtDate(currentUser?.subscriptionEndDate)}</p>
                </div>
                <div className="flex items-center gap-1 text-primary font-bold">
                  <span className="text-base">{fmt(currentUser?.credits?.remaining ?? currentUser?.credits ?? 0)}</span>
                  <GemIcon className="w-4 h-4" />
                </div>
              </div>
              <button
                onClick={() => { setPricingTrigger("profile_page"); setShowPricingSheet(true); }}
                className="w-full py-2.5 rounded-xl bg-[#ef1871] text-white font-bold text-sm"
              >
                تمدید اشتراک
              </button>
            </div>

            {/* payment history */}
            {payments.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-semibold">تاریخچه خرید</p>
                  <span className="text-xs text-muted-foreground">{payments.length} خرید</span>
                </div>
                <div className="divide-y divide-border">
                  {displayedPayments.map((p) => (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {PLAN_NAMES[p.type] ?? p.type} · {PERIOD_LABELS[p.period] ?? p.period}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(p.createdAt)}</p>
                      </div>
                      <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0", STATUS_CLS[p.status] ?? "bg-muted text-muted-foreground")}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                  ))}
                </div>
                {payments.length > 3 && (
                  <button
                    onClick={() => setShowAllPayments((v) => !v)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-3 border-t border-border"
                  >
                    {showAllPayments
                      ? <><ChevronUpIcon className="w-3.5 h-3.5" /> کمتر</>
                      : <><ChevronDownIcon className="w-3.5 h-3.5" /> {payments.length - 3} خرید دیگر</>}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-3">
            <p className="font-bold text-sm">هنوز اشتراکی نداری</p>
            <p className="text-xs text-muted-foreground leading-relaxed">با اشتراک پلاس به امکانات بیشتری دسترسی داشته باش</p>
            <button
              onClick={() => { setPricingTrigger("profile_page"); setShowPricingSheet(true); }}
              className="w-full py-3 rounded-xl bg-[#ef1871] text-white font-bold text-sm"
            >
              خرید اشتراک
            </button>
          </div>
        )}
      </motion.div>

      {/* Edit sheet */}
      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
        onSaved={handleProfileSaved}
      />
    </div>
  );
}
