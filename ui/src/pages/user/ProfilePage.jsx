import "react-spring-bottom-sheet/dist/style.css";

import React, { useEffect, useMemo, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { GemIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import useAuth from "@/auth/useAuth";
import apiClient from "@/lib/apiClient";
import { showPricingSheetAtom, pricingSheetTriggerSourceAtom, currentUserAtom } from "@/config/state";

// Sports identity imports
import { useProfileData }       from "@/features/profile/hooks/useProfileData";
import { profileService }       from "@/features/profile/services/profileService";
import ProfileHeader            from "@/features/profile/components/ProfileHeader";
import LevelSystem              from "@/features/profile/components/LevelSystem";
import StatsGrid                from "@/features/profile/components/StatsGrid";
import PerformanceCharts        from "@/features/profile/components/PerformanceCharts";
import RecentMatchesList        from "@/features/profile/components/RecentMatchesList";
import EditProfileSheet         from "@/features/profile/components/EditProfileSheet";
import ProfileSkeleton          from "@/features/profile/components/ProfileSkeleton";

// ─── Payment section helpers (kept intact) ───────────────────────────────────

const planNames   = { basic: "اشتراک پلاس", premium: "اشتراک پریمیوم", pro: "اشتراک حرفه‌ای" };
const periodLabels = { monthly: "۱ ماهه", quarterly: "۳ ماهه", halfYearly: "۶ ماهه", yearly: "۱۲ ماهه" };
const statusLabels = { pending: "در انتظار", completed: "موفق", failed: "ناموفق" };
const statusClasses = {
  pending:   "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
  failed:    "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200",
};

const formatNumber = (v) => {
  if (v == null || isNaN(v)) return "-";
  return new Intl.NumberFormat("fa-IR").format(v);
};
const formatDate = (v) => {
  if (!v) return "-";
  try { return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(v)); }
  catch { return "-"; }
};

function SectionLabel({ children }) {
  return <h3 className="text-sm font-bold text-foreground px-1">{children}</h3>;
}

function Divider() {
  return <div className="h-px bg-border mx-0" />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { currentUser, getUserImage }   = useAuth();
  const [, setCurrentUser]              = useAtom(currentUserAtom);
  const setShowPricingSheet             = useSetAtom(showPricingSheetAtom);
  const setPricingSheetTriggerSource    = useSetAtom(pricingSheetTriggerSourceAtom);

  // Sports profile data
  const { data: profileData, loading: profileLoading, refetch, setData } = useProfileData();
  const [editOpen, setEditOpen] = useState(false);

  // Payment data (existing logic kept intact)
  const [payments, setPayments]                 = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [showAllPayments, setShowAllPayments]    = useState(false);

  const hasEverPurchased = useMemo(() => payments.some((p) => p.status === "completed"), [payments]);
  const completedPayments = useMemo(() => payments.filter((p) => p.status === "completed"), [payments]);
  const lastCompletedPayment = completedPayments[0];
  const activePlanTitle = hasEverPurchased
    ? [planNames[currentUser?.subscriptionType], periodLabels[lastCompletedPayment?.period]].filter(Boolean).join(" ")
    : "";

  useEffect(() => {
    if (!currentUser) return;
    let mounted = true;
    const fetch = async () => {
      setIsLoadingPayments(true);
      const { ok, data } = await apiClient.get("/payment/history");
      if (!mounted) return;
      if (ok) setPayments(data?.payments ?? []);
      else toast.error("دریافت تاریخچه خرید با خطا روبه‌رو شد");
      setIsLoadingPayments(false);
    };
    fetch();
    return () => { mounted = false; };
  }, [currentUser]);

  const handleImageUpload = async (file) => {
    const res = await profileService.uploadImage(file);
    if (res.ok) {
      setCurrentUser((prev) => ({ ...prev, image: res.data.user.image }));
      toast.success("تصویر پروفایل به‌روز شد");
    } else {
      toast.error("خطا در آپلود تصویر");
    }
  };

  const handleProfileSaved = (updatedUser) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
    setData((prev) => prev ? { ...prev, user: { ...prev.user, ...updatedUser } } : prev);
  };

  const displayedPayments = showAllPayments ? payments : payments.slice(0, 3);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">

      {/* ── Sports Identity ── */}
      {profileLoading ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Profile Header */}
          <ProfileHeader
            user={profileData?.user ?? currentUser}
            rank={profileData?.level?.rank}
            onEditClick={() => setEditOpen(true)}
            onImageUpload={handleImageUpload}
          />

          <div className="space-y-4 pb-2">
            {/* Level / XP */}
            {profileData?.level && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <LevelSystem levelData={profileData.level} />
              </motion.div>
            )}

            {/* Stats */}
            {profileData?.stats && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="px-4 mb-2"><SectionLabel>📊 آمار بازی</SectionLabel></div>
                <StatsGrid stats={profileData.stats} />
              </motion.div>
            )}

            {/* Charts */}
            {profileData && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="px-4 mb-2"><SectionLabel>📈 عملکرد</SectionLabel></div>
                <PerformanceCharts
                  stats={profileData.stats}
                  weeklyActivity={profileData.weeklyActivity}
                />
              </motion.div>
            )}

            {/* Recent matches */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <div className="px-4 mb-2"><SectionLabel>⚔️ بازی‌های اخیر</SectionLabel></div>
              <div className="px-4">
                <RecentMatchesList
                  matches={profileData?.recentMatches ?? []}
                  loading={profileLoading}
                />
              </div>
            </motion.div>
          </div>

          <Divider />
        </>
      )}

      {/* ── Subscription Section (kept intact) ── */}
      <div className="px-4 pt-4 space-y-4 pb-4">
        <SectionLabel>💎 اشتراک</SectionLabel>

        {!currentUser || isLoadingPayments ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-28 rounded-2xl bg-muted" />
            <div className="h-40 rounded-2xl bg-muted" />
          </div>
        ) : hasEverPurchased ? (
          <>
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold">{activePlanTitle}</h4>
                <div className="flex items-center gap-0.5 text-sm text-primary">
                  <span>{formatNumber(currentUser?.credits?.remaining ?? currentUser?.credits ?? 0)}</span>
                  <GemIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>خرید: {formatDate(lastCompletedPayment?.createdAt)}</span>
                <span>انقضا: {formatDate(currentUser?.subscriptionEndDate)}</span>
              </div>
              <button
                onClick={() => { setPricingSheetTriggerSource("profile_page"); setShowPricingSheet(true); }}
                className="w-full py-3 rounded-xl bg-[#ef1871] text-white font-bold text-sm"
              >
                تمدید اشتراک
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">اشتراک‌های خریداری شده</p>
                {payments.length > 0 && (
                  <span className="text-xs text-muted-foreground">{formatNumber(payments.length)} خرید</span>
                )}
              </div>

              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">هنوز خریدی ثبت نشده است.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {displayedPayments.map((payment) => (
                      <div key={payment.id} className="rounded-xl border border-border p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {planNames[payment.type] ?? `اشتراک ${payment.type}`}{" "}
                            {periodLabels[payment.period] ?? payment.period}
                          </p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClasses[payment.status] ?? "bg-muted text-muted-foreground"}`}>
                            {statusLabels[payment.status] ?? "نامشخص"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>تاریخ خرید: {formatDate(payment.createdAt)}</p>
                          <p>مبلغ: {formatNumber(payment.amount / 10)} تومان</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {payments.length > 3 && (
                    <button
                      onClick={() => setShowAllPayments((v) => !v)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-1.5"
                    >
                      {showAllPayments ? <><ChevronUpIcon className="w-3.5 h-3.5" /> کمتر نشان بده</> : <><ChevronDownIcon className="w-3.5 h-3.5" /> همه خریدها ({payments.length})</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-3">
            <p className="font-bold">اشتراکی خریداری نشده</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              با خرید اشتراک پلاس به امکانات بیشتر دسترسی داشته باشید.
            </p>
            <button
              onClick={() => { setPricingSheetTriggerSource("profile_page"); setShowPricingSheet(true); }}
              className="w-full py-3 rounded-xl bg-[#ef1871] text-white font-bold text-sm"
            >
              خرید اشتراک
            </button>
          </div>
        )}
      </div>

      {/* Edit sheet */}
      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={profileData?.user ?? currentUser}
        onSaved={handleProfileSaved}
      />
    </div>
  );
}
