import React, { useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import toast from "react-hot-toast";

import useAuth from "@/auth/useAuth";
import apiClient from "@/lib/apiClient";
import { showPricingSheetAtom, pricingSheetTriggerSourceAtom } from "@/config/state";
import { GemIcon } from "lucide-react";

const planNames = {
  basic: "اشتراک پلاس",
  premium: "اشتراک پریمیوم",
  pro: "اشتراک حرفه‌ای",
};

const periodLabels = {
  monthly: "۱ ماهه",
  quarterly: "۳ ماهه",
  halfYearly: "۶ ماهه",
  yearly: "۱۲ ماهه",
};

const statusLabels = {
  pending: "در انتظار",
  completed: "موفق",
  failed: "ناموفق",
};

const statusClasses = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200",
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  if (isNaN(value)) return value;
  return new Intl.NumberFormat("fa-IR").format(value);
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "-";
  }
};

function ProfilePage() {
  const { currentUser, getUserImage } = useAuth();
  const setShowPricingSheet = useSetAtom(showPricingSheetAtom);
  const setPricingSheetTriggerSource = useSetAtom(pricingSheetTriggerSourceAtom);

  const [payments, setPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  const hasEverPurchased = useMemo(() => {
    return payments.some((payment) => payment.status === "completed");
  }, [payments]);

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    const fetchPayments = async () => {
      setIsLoadingPayments(true);
      const { ok, data } = await apiClient.get("/payment/history");

      if (!isMounted) return;

      if (ok) {
        setPayments(data?.payments ?? []);
      } else {
        toast.error("دریافت تاریخچه خرید با خطا روبه‌رو شد.");
      }
      setIsLoadingPayments(false);
    };

    fetchPayments();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const completedPayments = useMemo(
    () => payments.filter((payment) => payment.status === "completed"),
    [payments]
  );

  const lastCompletedPayment = completedPayments[0];

  const activePlanTitle = hasEverPurchased
    ? [
        planNames[currentUser?.subscriptionType] ?? "اشتراک",
        periodLabels[lastCompletedPayment?.period],
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const handlePurchaseClick = () => {
    setPricingSheetTriggerSource("profile_page");
    setShowPricingSheet(true);
  };

  const renderPayments = () => {
    if (isLoadingPayments) {
      return (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-16 rounded-2xl bg-muted/60 dark:bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (!payments.length) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          هنوز خریدی ثبت نشده است.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {payments.map((payment) => {
          const planLabel = planNames[payment.type] ?? `اشتراک ${payment.type}`;
          const periodLabel = periodLabels[payment.period] ?? payment.period;
          const statusLabel = statusLabels[payment.status] ?? "نامشخص";

          return (
            <div
              key={payment.id}
              className="rounded-2xl border border-border/60 dark:border-border/40 p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {planLabel} {periodLabel}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    statusClasses[payment.status] ??
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>تاریخ خرید: {formatDate(payment.createdAt)}</p>
                <p>مبلغ: {formatNumber(payment.amount / 10)} تومان</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 py-6 max-w-md mx-auto px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20 bg-primary/5">
          <img
            src={getUserImage()}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-lg font-semibold" dir="ltr">
          {currentUser?.phone || "-"}
        </p>
      </div>

      {!currentUser || isLoadingPayments ? (
        <div className="space-y-4">
          <div className="rounded-3xl bg-primary/5 p-5 space-y-4 animate-pulse">
            <div className="flex items-start justify-between gap-2">
              <div className="h-6 bg-muted/60 dark:bg-muted/20 rounded w-32"></div>
              <div className="h-5 bg-muted/60 dark:bg-muted/20 rounded w-24"></div>
            </div>
            <div className="justify-between flex">
              <div className="h-4 bg-muted/60 dark:bg-muted/20 rounded w-28"></div>
              <div className="h-4 bg-muted/60 dark:bg-muted/20 rounded w-28"></div>
            </div>
            <div className="h-12 bg-muted/60 dark:bg-muted/20 rounded-2xl"></div>
          </div>
          <div className="rounded-3xl bg-card border border-border/60 p-5 space-y-4 shadow-sm animate-pulse">
            <div className="h-5 bg-muted/60 dark:bg-muted/20 rounded w-40"></div>
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-16 rounded-2xl bg-muted/60 dark:bg-muted/20"
                />
              ))}
            </div>
          </div>
        </div>
      ) : hasEverPurchased ? (
        <>
          <div className="rounded-3xl bg-primary/5 p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold w-full">{activePlanTitle}</h2>
              <div className="flex items-start justify-end w-full text-sm gap-0.5">
                <p className="text-muted-foreground">باقی‌مانده جم:</p>
                <p className="text-primary">
                  {formatNumber(
                    currentUser?.credits?.remaining || currentUser?.credits || 0
                  )}
                </p>
                <GemIcon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="justify-between flex">
              <p className="text-xs text-muted-foreground">
                تاریخ خرید: {formatDate(lastCompletedPayment?.createdAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                تاریخ انقضا: {formatDate(currentUser?.subscriptionEndDate)}
              </p>
            </div>

            <button
              onClick={handlePurchaseClick}
              className="w-full py-3 rounded-2xl bg-[#ef1871] text-white font-bold shadow"
            >
              تمدید اشتراک{" "}
            </button>
          </div>

          <div className="rounded-3xl bg-card border border-border/60 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                اشتراک‌های خریداری شده
              </h3>
              {!isLoadingPayments && payments.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatNumber(payments.length)} خرید
                </span>
              )}
            </div>
            {renderPayments()}
          </div>
        </>
      ) : (
        <div className="rounded-3xl bg-card border border-border/60 p-5 shadow-sm space-y-4 text-center">
          <h2 className="text-lg font-bold">شما تاکنون اشتراکی نخریده‌اید.</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            با خرید اشتراک پلاس به دنیای بی‌انتهای هوش مصنوعی دسترسی پیدا کن‌.
          </p>
          <button
            onClick={handlePurchaseClick}
            className="w-full py-3 rounded-2xl bg-[#ef1871] text-white font-bold shadow"
          >
            خرید اشتراک
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
