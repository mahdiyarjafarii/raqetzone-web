import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "framer-motion";
import { BottomSheet } from "react-spring-bottom-sheet";
import toast from "react-hot-toast";
import {
  BadgeCheckIcon,
  BanknoteIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Clock3Icon,
  Globe2Icon,
  GraduationCapIcon,
  Loader2Icon,
  MapPinIcon,
  MessageCircleIcon,
  SendIcon,
  Settings2Icon,
  SparklesIcon,
  StarIcon,
  TicketIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";

import { currentUserAtom } from "@/config/state";
import { coachService } from "@/services/coachService";
import { walletService } from "@/features/wallet/walletService";
import PersianDateTimeInput from "@/components/ui/PersianDateTimeInput";

import "react-spring-bottom-sheet/dist/style.css";

const TAB_KEYS = ["about", "classes", "reviews"];


const SPORT_LABELS = {
  padel: "🥎 پدل",
  tennis: "🎾 تنیس",
  squash: "🟡 اسکواش",
  badminton: "🏸 بدمینتون",
  "ping-pong": "🏓 پینگ‌پنگ",
};

const LEVEL_LABELS = {
  all: "✨ همه سطوح",
  beginner: "🌱 مبتدی",
  intermediate: "⚡ متوسط",
  advanced: "🔥 پیشرفته",
};

function getSportLabel(sport) {
  if (!sport) return "🥎 پدل";
  return SPORT_LABELS[sport] ?? sport;
}

function getLevelLabel(level) {
  return LEVEL_LABELS[level] ?? LEVEL_LABELS.all;
}

function formatClassDate(dateKey) {
  if (!dateKey) return "—";
  try {
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString("fa-IR", { month: "long", day: "numeric" });
  } catch {
    return dateKey;
  }
}

function formatToman(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function getUserFullName(user) {
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const lastName = typeof user?.lastName === "string" ? user.lastName.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user?.name || "";
}

function getReviewUserName(user) {
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const lastName = typeof user?.lastName === "string" ? user.lastName.trim() : "";
  return `${firstName} ${lastName}`.trim() || user?.name || "کاربر";
}

function StarView({ value, size = "w-3.5 h-3.5" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          className={`${size} ${n <= value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <StarIcon className={`w-6 h-6 ${n <= value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

function getProfileImage(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

const SPORT_GRADIENTS = {
  tennis:    ["#1a6b3c", "#0f4d2b", "#16a34a"],
  padel:     ["#1e3a8a", "#1d4ed8", "#3b82f6"],
  squash:    ["#7c2d12", "#b45309", "#f59e0b"],
  badminton: ["#4c1d95", "#6d28d9", "#a78bfa"],
  "ping-pong": ["#134e4a", "#0f766e", "#2dd4bf"],
};

function CoachBanner({ sport, coachImage }) {
  const colors = SPORT_GRADIENTS[sport] ?? ["#1e1b4b", "#2B0FD9", "#4338ca"];
  const [c1, c2, c3] = colors;

  return (
    <div className="relative h-36 overflow-hidden">
      {/* base gradient */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)` }}
      />

      {/* radial glow blobs */}
      <div
        className="absolute -top-8 -right-8 h-40 w-40 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle, ${c3}cc 0%, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full opacity-30"
        style={{ background: `radial-gradient(circle, ${c1}bb 0%, transparent 70%)` }}
      />

      {/* coach image — subtle, faded on the right */}
      {coachImage && (
        <div className="absolute inset-0">
          <img
            src={coachImage}
            alt=""
            className="absolute right-0 top-0 h-full w-2/3 object-cover object-top"
            style={{
              maskImage: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, transparent 80%)",
              WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, transparent 80%)",
            }}
          />
        </div>
      )}

      {/* sport emoji watermark */}
      <div
        className="absolute bottom-2 left-4 text-5xl select-none pointer-events-none"
        style={{ opacity: 0.12, filter: "blur(1px)" }}
      >
        {SPORT_LABELS[sport]?.split(" ")[0] ?? "🎾"}
      </div>

      {/* bottom fade into card */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
    </div>
  );
}

export default function CoachDetailPage() {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAtomValue(currentUserAtom);

  const [coach, setCoach] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingClassId, setEnrollingClassId] = useState("");
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    date: "",
    startTime: "",
    location: "",
    notes: "",
  });
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, total: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "" });
  const [reviewSaving, setReviewSaving] = useState(false);
  const initialTab = TAB_KEYS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "about";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [enrollSheetOpen, setEnrollSheetOpen] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [enrollReceipt, setEnrollReceipt] = useState(null);

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);
    setSearchParams(params, { replace: true });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const queryTab = searchParams.get("tab");
    if (TAB_KEYS.includes(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [searchParams]);

  const isOwnCoachProfile = useMemo(() => {
    return (
      currentUser?.id &&
      currentUser.id === coachId &&
      currentUser?.isCoach
    );
  }, [coachId, currentUser]);

  const load = async () => {
    setLoading(true);
    const [{ ok, data }, reviewRes] = await Promise.all([
      coachService.getCoachDetail(coachId),
      coachService.getCoachReviews(coachId),
    ]);
    if (!ok) {
      toast.error(data?.message ?? "خطا در دریافت اطلاعات مربی");
      setLoading(false);
      return;
    }
    setCoach(data?.coach ?? null);
    setClasses(Array.isArray(data?.classes) ? data.classes : []);

    if (reviewRes?.ok) {
      const nextReviews = Array.isArray(reviewRes.data?.reviews) ? reviewRes.data.reviews : [];
      setReviews(nextReviews);
      setReviewStats(reviewRes.data?.stats ?? { average: 0, total: 0 });
      const myReview = nextReviews.find((item) => item.userId === currentUser?.id);
      setReviewForm({
        rating: Number(myReview?.rating ?? 0),
        comment: myReview?.comment ?? "",
      });
    } else {
      setReviews([]);
      setReviewStats({ average: 0, total: 0 });
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [coachId]);

  const openEnrollSheet = async (cls) => {
    setEnrollTarget(cls);
    setEnrollReceipt(null);
    setEnrollSheetOpen(true);
    if (Number(cls.price ?? 0) > 0) {
      setWalletLoading(true);
      const { ok, data } = await walletService.getWallet();
      setWallet(ok ? data?.wallet ?? null : null);
      setWalletLoading(false);
    }
  };

  const handleConfirmEnroll = async () => {
    if (!enrollTarget) return;
    const price = Number(enrollTarget.price ?? 0);
    const balance = Number(wallet?.balance ?? 0);

    if (price > 0 && balance < price) {
      toast.error("موجودی کیف پول کافی نیست");
      return;
    }

    setEnrollingClassId(enrollTarget.id);
    const { ok, data } = await coachService.enrollClass(enrollTarget.id, {
      paymentMethod: price > 0 ? "wallet" : "none",
    });
    setEnrollingClassId("");

    if (!ok) {
      toast.error(data?.message ?? "ثبت‌نام انجام نشد");
      return;
    }

    if (data?.wallet) setWallet(data.wallet);
    setEnrollReceipt(data?.receipt ?? { trackingCode: "—", amountPaid: price, title: enrollTarget.title });
    toast.success("ثبت‌نام کلاس انجام شد");
    load();
  };

  const handleStartConversation = async () => {
    const { ok, data } = await coachService.startConversationWithCoach(coachId);
    if (!ok) {
      toast.error(data?.message ?? "امکان شروع گفتگو وجود ندارد");
      return;
    }
    navigate(`/messages/${data?.conversation?.id}`);
  };

  const handleBookPrivateSession = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    // endTime is always startTime + 1 hour
    let endTime = "";
    if (bookingForm.startTime) {
      const [h, m] = bookingForm.startTime.split(":").map(Number);
      const endH = (h + 1) % 24;
      endTime = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const { ok, data } = await coachService.bookPrivateSession(coachId, { ...bookingForm, endTime });
    setBookingLoading(false);
    if (!ok) {
      toast.error(data?.message ?? "ثبت جلسه خصوصی انجام نشد");
      return;
    }
    toast.success("درخواست جلسه خصوصی ثبت شد");
    setBookingForm({ date: "", startTime: "", location: "", notes: "" });
    setBookingSheetOpen(false);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("برای ثبت نظر ابتدا وارد شوید");
      return;
    }
    if (!reviewForm.rating) {
      toast.error("لطفاً امتیاز را انتخاب کنید");
      return;
    }

    setReviewSaving(true);
    const { ok, data } = await coachService.upsertCoachReview(coachId, reviewForm);
    setReviewSaving(false);
    if (!ok) {
      toast.error(data?.message ?? "ثبت نظر انجام نشد");
      return;
    }
    toast.success("نظر شما ثبت شد");
    await load();
  };

  if (loading) {
    return <div className="p-4" dir="rtl"><div className="h-48 rounded-2xl bg-muted animate-pulse" /></div>;
  }

  if (!coach) {
    return <div className="p-4 text-sm text-muted-foreground" dir="rtl">مربی یافت نشد</div>;
  }

  const coachName = getUserFullName(coach) || "مربی رکت‌زون";
  const coachImage = getProfileImage(coach.image);
  const coachRating = Number(reviewStats.average || 0).toFixed(1);
  const activeClasses = classes.length;
  const tabs = [
    { key: "about", label: "درباره" },
    { key: "classes", label: `کلاس‌ها (${activeClasses})` },
    { key: "reviews", label: `نظرات (${reviewStats.total || 0})` },
  ];

  return (
    <div className="px-3 py-4 sm:px-4 space-y-4" dir="rtl">
      <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-sm">
        <CoachBanner sport={coach.favoriteSport} coachImage={coachImage} />
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          {reviewStats.total > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-md">
              <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {coachRating}
              <span className="font-medium text-white/70">({reviewStats.total})</span>
            </div>
          )}
        </div>

        <div className="relative z-10 px-4 pb-4">
          <div className="-mt-12 flex items-end gap-3">
            <div className="h-24 w-24 rounded-3xl overflow-hidden bg-muted shrink-0 ring-4 ring-card shadow-xl">
              {coachImage ? (
                <img src={coachImage} alt={coachName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-3xl font-black text-muted-foreground">
                  {coachName?.[0] ?? "م"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black text-foreground truncate">{coachName}</h1>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {coach.coachHeadline || coach.bio || "مربی حرفه‌ای رکت‌زون"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <MapPinIcon className="w-3 h-3" />
              {coach.city || "نامشخص"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              {getSportLabel(coach.favoriteSport)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border bg-background p-2.5 text-center">
              <p className="text-base font-black text-foreground">{coachRating}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">از {reviewStats.total || 0} نظر</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-2.5 text-center">
              <p className="text-base font-black text-foreground">{activeClasses}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">کلاس فعال</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-2.5 text-center">
              <p className="text-sm font-black text-foreground">{coach.coachHourlyPrice ? `${Number(coach.coachHourlyPrice).toLocaleString("fa-IR")}` : "—"}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">تومان / جلسه</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-2 z-30 space-y-2">
        <div className="rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl p-2 shadow-lg shadow-black/5">
          {isOwnCoachProfile ? (
            <Link
              to="/coach/management"
              className="h-11 rounded-xl border border-primary/20 bg-primary/10 text-primary px-3 text-xs font-black inline-flex items-center justify-between w-full"
            >
              <span>مدیریت حرفه‌ای کلاس‌ها</span>
              <Settings2Icon className="w-4 h-4" />
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleStartConversation}
                className="h-11 rounded-xl bg-primary text-primary-foreground text-xs font-black inline-flex items-center justify-center gap-1.5"
              >
                <MessageCircleIcon className="w-4 h-4" />
                پیام مستقیم
              </button>
              <button
                type="button"
                onClick={() => setBookingSheetOpen(true)}
                className="h-11 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-black inline-flex items-center justify-center gap-1.5"
              >
                <CalendarDaysIcon className="w-4 h-4" />
                رزرو جلسه
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl p-1.5 shadow-lg shadow-black/5">
          <div className="grid grid-cols-3 gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`relative h-9 rounded-xl text-[11px] font-black transition-colors ${activeTab === tab.key ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                {activeTab === tab.key && (
                  <motion.span
                    layoutId="coach-tab-pill"
                    className="absolute inset-0 rounded-xl bg-primary shadow-md"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
      {activeTab === "about" && (
        <motion.div
          key="about"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="rounded-3xl border border-border bg-card p-4 space-y-3"
        >
          <p className="text-sm font-black text-foreground inline-flex items-center gap-1.5">
            <SparklesIcon className="w-4 h-4 text-primary" />
            درباره مربی
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div className="rounded-2xl border border-border bg-background px-3 py-2 inline-flex items-center gap-1.5">
              <BriefcaseBusinessIcon className="w-3.5 h-3.5 text-primary" />
              {coach.coachExperienceYears ? `${coach.coachExperienceYears} سال تجربه` : "تجربه نامشخص"}
            </div>
            <div className="rounded-2xl border border-border bg-background px-3 py-2 inline-flex items-center gap-1.5">
              <BanknoteIcon className="w-3.5 h-3.5 text-primary" />
              {coach.coachHourlyPrice ? `${Number(coach.coachHourlyPrice).toLocaleString("fa-IR")} ت / جلسه` : "قیمت توافقی"}
            </div>
            <div className="col-span-2 rounded-2xl border border-border bg-background px-3 py-2 inline-flex items-center gap-1.5">
              <Globe2Icon className="w-3.5 h-3.5 text-primary" />
              {coach.coachLanguages || "زبان‌ها مشخص نشده"}
            </div>
            <div className="col-span-2 rounded-2xl border border-border bg-background px-3 py-2 inline-flex items-center gap-1.5">
              <GraduationCapIcon className="w-3.5 h-3.5 text-primary" />
              {coach.coachCertifications || "اطلاعات مدارک ثبت نشده"}
            </div>
          </div>
          {coach.coachSpecialties ? <p className="text-xs text-muted-foreground leading-5"><span className="font-bold text-foreground">تخصص‌ها:</span> {coach.coachSpecialties}</p> : null}
          {coach.bio ? <p className="text-xs text-muted-foreground leading-6">{coach.bio}</p> : null}
        </motion.div>
      )}

      {activeTab === "classes" && (
        <motion.div
          key="classes"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-black text-foreground">کلاس‌های مربی</h2>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              هنوز کلاسی ثبت نشده.
            </div>
          ) : (
            classes.map((cls) => {
              const isFull = Number(cls.enrolledCount) >= Number(cls.capacity);
              return (
                <div key={cls.id} className="rounded-3xl border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{cls.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{getSportLabel(cls.sportType)} • {cls.city || "نامشخص"}</p>
                    </div>
                    <span className="text-xs font-bold text-primary">{Number(cls.price || 0) > 0 ? `${formatToman(cls.price)} ت` : "رایگان"}</span>
                  </div>

                  {cls.description && <p className="text-xs text-muted-foreground leading-5">{cls.description}</p>}

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 font-bold">
                      {getLevelLabel(cls.level)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                      <UsersIcon className="w-3 h-3" />
                      {cls.enrolledCount ?? 0}/{cls.capacity}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                      <CalendarDaysIcon className="w-3 h-3" />
                      {cls.sessionsCount ?? (Array.isArray(cls.sessions) ? cls.sessions.length : 0)} جلسه
                    </span>
                  </div>

                  {(cls.startDate || cls.endDate) && (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-muted/60 px-2.5 py-1.5 text-[11px] text-foreground/80">
                      <Clock3Icon className="w-3.5 h-3.5 text-primary" />
                      از {formatClassDate(cls.startDate)} تا {formatClassDate(cls.endDate)}
                    </div>
                  )}

                  {Array.isArray(cls.sessions) && cls.sessions.length > 0 && (
                    <div className="rounded-xl bg-muted/60 p-2 text-[11px] space-y-1">
                      {cls.sessions.slice(0, 3).map((s, idx) => (
                        <p key={idx}>{formatClassDate(s.date)} • {s.startTime} تا {s.endTime}</p>
                      ))}
                      {cls.sessions.length > 3 && (
                        <p className="text-muted-foreground">+ {cls.sessions.length - 3} جلسه دیگر</p>
                      )}
                    </div>
                  )}

                  {!isOwnCoachProfile && (
                    <button
                      type="button"
                      onClick={() => openEnrollSheet(cls)}
                      disabled={isFull}
                      className="h-9 w-full rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
                    >
                      {isFull ? "ظرفیت تکمیل شده" : "شرکت در کلاس"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {activeTab === "reviews" && (
        <motion.div
          key="reviews"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-foreground">نظرات کاربران</p>
            <div className="text-left">
              <p className="text-sm font-black text-foreground">{reviewStats.average || "0.0"}</p>
              <p className="text-[10px] text-muted-foreground">{reviewStats.total || 0} نظر</p>
            </div>
          </div>

          {currentUser && !isOwnCoachProfile && (
            <form onSubmit={handleSubmitReview} className="rounded-xl border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-bold text-foreground">نظر شما</p>
              <StarInput
                value={reviewForm.rating}
                onChange={(value) => setReviewForm((prev) => ({ ...prev, rating: value }))}
              />
              <textarea
                rows={2}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="نظرت درباره این مربی..."
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={reviewSaving}
                className="h-9 w-full rounded-xl bg-primary text-primary-foreground text-xs font-black inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <SendIcon className="w-3.5 h-3.5" />
                {reviewSaving ? "در حال ثبت..." : "ثبت نظر"}
              </button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-xs text-muted-foreground">هنوز نظری ثبت نشده.</p>
          ) : (
            <div className="space-y-2">
              {reviews.map((review) => {
                const fullName = getReviewUserName(review.user);
                const imageSrc = getProfileImage(review.user?.image);
                return (
                  <div key={review.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted">
                          {imageSrc ? (
                            <img src={imageSrc} alt={fullName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-black text-muted-foreground">
                              {fullName?.[0] ?? "ک"}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{fullName}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString("fa-IR")}</p>
                        </div>
                      </div>
                      <StarView value={Number(review.rating || 0)} />
                    </div>
                    {review.comment ? <p className="text-xs text-muted-foreground leading-5">{review.comment}</p> : null}
                    {review.coachReply ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-2">
                        <p className="text-[10px] font-bold text-primary">پاسخ مربی</p>
                        <p className="mt-1 text-xs text-foreground/90 leading-5">{review.coachReply}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>

      <BottomSheet
        open={bookingSheetOpen}
        onDismiss={() => setBookingSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.82, 620)]}
      >
        <div className="bg-[#fbfaf8] dark:bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          <form onSubmit={handleBookPrivateSession} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-black text-foreground">رزرو جلسه خصوصی با {coachName}</p>
            {coach?.coachHourlyPrice && (
              <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                <span className="text-xs text-muted-foreground">قیمت هر جلسه (۱ ساعت)</span>
                <span className="text-sm font-black text-foreground">
                  {Number(coach.coachHourlyPrice).toLocaleString("fa-IR")} تومان
                </span>
              </div>
            )}
            <PersianDateTimeInput
              value={bookingForm.date ? `${bookingForm.date}T${bookingForm.startTime || "12:00"}` : ""}
              onChange={(value) => {
                const [date, startTime] = value.split("T");
                setBookingForm((prev) => ({ ...prev, date, startTime }));
              }}
              label="تاریخ و ساعت شروع"
              title="انتخاب زمان شروع جلسه"
              dateHint="اول تاریخ جلسه را انتخاب کن"
              timeHint="حالا ساعت شروع جلسه را مشخص کن"
              placeholder="انتخاب تاریخ و ساعت شروع"
              confirmLabel="تایید زمان شروع"
            />
            {bookingForm.startTime && (
              <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                <span className="text-xs text-muted-foreground">ساعت پایان (خودکار)</span>
                <span className="text-sm font-bold text-foreground">
                  {(() => {
                    const [h, m] = bookingForm.startTime.split(":").map(Number);
                    const endH = (h + 1) % 24;
                    return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                  })()}
                </span>
              </div>
            )}
            <input
              type="text"
              required
              value={bookingForm.location}
              onChange={(e) => setBookingForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="محل برگزاری *"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
            <textarea
              rows={3}
              required
              value={bookingForm.notes}
              onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="توضیح یا هدف جلسه *"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={bookingLoading}
              className="h-10 w-full rounded-xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-50"
            >
              {bookingLoading ? "در حال ثبت..." : "ثبت درخواست جلسه خصوصی"}
            </button>
          </form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={enrollSheetOpen}
        onDismiss={() => setEnrollSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.86, 660)]}
      >
        <div className="bg-[#fbfaf8] dark:bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          {enrollTarget && (() => {
            const price = Number(enrollTarget.price ?? 0);
            const balance = Number(wallet?.balance ?? 0);
            const insufficient = price > 0 && balance < price;
            const sessionsCount = enrollTarget.sessionsCount ?? (Array.isArray(enrollTarget.sessions) ? enrollTarget.sessions.length : 0);

            if (enrollReceipt) {
              return (
                <div className="rounded-3xl border border-border bg-card p-5 space-y-4 text-center">
                  <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2Icon className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-base font-black text-foreground">ثبت‌نام با موفقیت انجام شد</p>
                    <p className="mt-1 text-xs text-muted-foreground">{enrollReceipt.title || enrollTarget.title}</p>
                  </div>

                  <div className="rounded-2xl border border-dashed border-border bg-background p-3 space-y-2 text-right">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground inline-flex items-center gap-1"><TicketIcon className="w-3.5 h-3.5" /> کد پیگیری</span>
                      <span className="font-black text-foreground tracking-wide">{enrollReceipt.trackingCode}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">مبلغ پرداختی</span>
                      <span className="font-bold text-foreground">{Number(enrollReceipt.amountPaid ?? 0) > 0 ? `${formatToman(enrollReceipt.amountPaid)} تومان` : "رایگان"}</span>
                    </div>
                    {Number(enrollReceipt.amountPaid ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">روش پرداخت</span>
                        <span className="font-bold text-foreground">کیف پول</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">تعداد جلسات</span>
                      <span className="font-bold text-foreground">{sessionsCount} جلسه</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEnrollSheetOpen(false)}
                    className="h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-black"
                  >
                    باشه، فهمیدم
                  </button>
                </div>
              );
            }

            return (
              <div className="rounded-3xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-foreground">رسید ثبت‌نام کلاس</p>
                  <button type="button" onClick={() => setEnrollSheetOpen(false)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-background p-3 space-y-2">
                  <p className="text-sm font-bold text-foreground">{enrollTarget.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 font-bold">{getLevelLabel(enrollTarget.level)}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{getSportLabel(enrollTarget.sportType)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><CalendarDaysIcon className="w-3 h-3" />{sessionsCount} جلسه</span>
                  </div>
                  {(enrollTarget.startDate || enrollTarget.endDate) && (
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                      <Clock3Icon className="w-3.5 h-3.5 text-primary" />
                      از {formatClassDate(enrollTarget.startDate)} تا {formatClassDate(enrollTarget.endDate)}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">هزینه کلاس</span>
                    <span className="font-black text-foreground">{price > 0 ? `${formatToman(price)} تومان` : "رایگان"}</span>
                  </div>
                  {price > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground inline-flex items-center gap-1"><WalletIcon className="w-3.5 h-3.5" /> موجودی کیف پول</span>
                      <span className={`font-bold ${insufficient ? "text-rose-500" : "text-foreground"}`}>
                        {walletLoading ? "..." : `${formatToman(balance)} تومان`}
                      </span>
                    </div>
                  )}
                </div>

                {insufficient && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2">
                    <span>موجودی کیف پول کافی نیست.</span>
                    <Link to="/profile" className="font-black underline">شارژ کیف پول</Link>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmEnroll}
                  disabled={enrollingClassId === enrollTarget.id || (price > 0 && (walletLoading || insufficient))}
                  className="h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {enrollingClassId === enrollTarget.id ? (
                    <><Loader2Icon className="w-4 h-4 animate-spin" /> در حال ثبت...</>
                  ) : price > 0 ? (
                    <><WalletIcon className="w-4 h-4" /> پرداخت و ثبت‌نام</>
                  ) : (
                    "ثبت‌نام رایگان"
                  )}
                </button>
              </div>
            );
          })()}
        </div>
      </BottomSheet>
    </div>
  );
}
