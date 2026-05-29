import "react-spring-bottom-sheet/dist/style.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  PencilIcon, CameraIcon, ChevronRightIcon,
  SwordsIcon, TrophyIcon, TrendingUpIcon,
  GemIcon, ChevronDownIcon, ChevronUpIcon,
} from "lucide-react";

import useAuth from "@/auth/useAuth";
import apiClient from "@/lib/apiClient";
import { showPricingSheetAtom, pricingSheetTriggerSourceAtom, currentUserAtom } from "@/config/state";
import { useProfileData } from "@/features/profile/hooks/useProfileData";
import { profileService } from "@/features/profile/services/profileService";
import EditProfileSheet from "@/features/profile/components/EditProfileSheet";
import RecentMatchesList from "@/features/profile/components/RecentMatchesList";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

const SKILL_CONFIG = {
  beginner:     { label: "مبتدی",    color: "bg-emerald-500/15 text-emerald-600" },
  intermediate: { label: "متوسط",    color: "bg-blue-500/15 text-blue-600" },
  advanced:     { label: "پیشرفته",  color: "bg-violet-500/15 text-violet-600" },
  pro:          { label: "حرفه‌ای",  color: "bg-amber-500/15 text-amber-600" },
};
const SPORT_ICON = { padel: "🏓", tennis: "🎾", squash: "🟡", badminton: "🏸" };
const PLAN_NAMES = { basic: "پلاس", premium: "پریمیوم", pro: "حرفه‌ای" };
const PERIOD_LABELS = { monthly: "۱ ماهه", quarterly: "۳ ماهه", halfYearly: "۶ ماهه", yearly: "۱۲ ماهه" };
const STATUS_LABEL = { pending: "در انتظار", completed: "موفق", failed: "ناموفق" };
const STATUS_CLS = {
  pending:   "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  failed:    "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};
const fmt = (v) => v == null ? "-" : new Intl.NumberFormat("fa-IR").format(v);
const fmtDate = (v) => {
  if (!v) return "-";
  try { return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(v)); }
  catch { return "-"; }
};

// ─── sub-components ─────────────────────────────────────────────────────────

function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-3">
      <span className={cn("text-xl font-black", color)}>{value ?? "—"}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function XpBar({ levelData }) {
  if (!levelData) return null;
  const { current, progressPct, rank, progressXp, neededXp } = levelData;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold text-foreground">سطح {current}</span>
        <span className="text-muted-foreground">{fmt(progressXp)} / {fmt(neededXp)} XP</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${rank?.gradient?.[0] ?? "#6366f1"}, ${rank?.gradient?.[1] ?? "#8b5cf6"})` }}
        />
      </div>
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { currentUser, getUserImage } = useAuth();
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const setShowPricingSheet = useSetAtom(showPricingSheetAtom);
  const setPricingTrigger = useSetAtom(pricingSheetTriggerSourceAtom);

  const { data: profileData, loading, setData } = useProfileData();
  const [editOpen, setEditOpen] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
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

  const hasEverPurchased = useMemo(() => payments.some((p) => p.status === "completed"), [payments]);
  const lastCompleted = useMemo(() => payments.find((p) => p.status === "completed"), [payments]);

  const handleImageUpload = async (file) => {
    const res = await profileService.uploadImage(file);
    if (res.ok) {
      setCurrentUser((prev) => ({ ...prev, image: res.data.user.image }));
      toast.success("عکس پروفایل به‌روز شد");
    } else {
      toast.error("خطا در آپلود عکس");
    }
  };

  const handleProfileSaved = (updatedUser) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
    setData((prev) => prev ? { ...prev, user: { ...prev.user, ...updatedUser } } : prev);
  };

  const user = profileData?.user ?? currentUser;
  const stats = profileData?.stats;
  const skill = SKILL_CONFIG[user?.skillLevel] ?? SKILL_CONFIG.beginner;
  const displayedPayments = showAllPayments ? payments : payments.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative px-5 pt-10 pb-6">
        {/* subtle gradient bg */}
        <div
          className="absolute inset-x-0 top-0 h-48 pointer-events-none opacity-[0.07]"
          style={{ background: `linear-gradient(160deg, ${profileData?.level?.rank?.gradient?.[0] ?? "#6366f1"}, ${profileData?.level?.rank?.gradient?.[1] ?? "#8b5cf6"})` }}
        />

        {/* edit button */}
        <button
          onClick={() => setEditOpen(true)}
          className="absolute top-5 left-5 z-10 w-9 h-9 rounded-full bg-muted flex items-center justify-center"
        >
          <PencilIcon className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* avatar */}
        <div className="relative w-fit mx-auto mb-4">
          {loading ? (
            <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
          ) : (
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              src={getUserImage(user?.image)}
              alt={user?.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-border shadow-md"
            />
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
          >
            <CameraIcon className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        </div>

        {/* name + badges */}
        {loading ? (
          <div className="space-y-2 flex flex-col items-center">
            <div className="h-6 w-32 rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : (
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-foreground">{user?.name ?? user?.phone ?? "بازیکن"}</h1>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className={cn("text-xs px-3 py-1 rounded-full font-semibold", skill.color)}>
                {skill.label}
              </span>
              {user?.favoriteSport && (
                <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                  {SPORT_ICON[user.favoriteSport]} {user.favoriteSport}
                </span>
              )}
            </div>
            {user?.bio && (
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{user.bio}</p>
            )}
          </div>
        )}

        {/* XP bar */}
        {profileData?.level && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5"
          >
            <XpBar levelData={profileData.level} />
          </motion.div>
        )}
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-5 rounded-2xl bg-card border border-border overflow-hidden"
        >
          <div className="flex divide-x divide-x-reverse divide-border">
            <StatPill icon={SwordsIcon} value={stats.totalMatches} label="کل بازی‌ها" color="text-foreground" />
            <StatPill icon={TrophyIcon} value={stats.wins} label="برد" color="text-emerald-500" />
            <StatPill icon={TrendingUpIcon} value={stats.winRate != null ? `${stats.winRate}%` : null} label="نرخ برد" color="text-primary" />
          </div>
        </motion.div>
      )}

      {/* ── Recent matches ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="mt-6 px-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">بازی‌های اخیر</h2>
          <Link to="/tournament" className="text-xs text-primary flex items-center gap-0.5">
            همه <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <RecentMatchesList matches={profileData?.recentMatches ?? []} loading={loading} />
      </motion.div>

      {/* ── Subscription ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mt-6 px-5 space-y-3"
      >
        <h2 className="text-sm font-bold text-foreground">اشتراک</h2>

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
