import React, { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import { BottomSheet } from "react-spring-bottom-sheet";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Clock3Icon,
  MessageSquareIcon,
  PlusIcon,
  SendIcon,
  StarIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
  UserRoundPenIcon,
} from "lucide-react";

import { currentUserAtom } from "@/config/state";
import { cn } from "@/lib/utils";
import { coachService } from "@/services/coachService";
import apiClient from "@/lib/apiClient";
import {
  addDaysToDateKey,
  formatPersianDateInTehran,
  formatDateKeyInTehran,
  parseDateKeyAsUTCNoon,
  getTodayDateKeyInTehran,
} from "@/lib/timezone";

import "react-spring-bottom-sheet/dist/style.css";

const PERSIAN_WEEKDAYS = [
  { label: "شنبه", utcDay: 6 },
  { label: "یکشنبه", utcDay: 0 },
  { label: "دوشنبه", utcDay: 1 },
  { label: "سه‌شنبه", utcDay: 2 },
  { label: "چهارشنبه", utcDay: 3 },
  { label: "پنجشنبه", utcDay: 4 },
  { label: "جمعه", utcDay: 5 },
];

const initialClassForm = {
  title: "",
  description: "",
  sportType: "padel",
  city: "",
  level: "all",
  venueMode: "platform",
  clubId: "",
  courtId: "",
  customLocation: "",
  customCourtName: "",
  price: "",
  capacity: "",
  schedStartDate: getTodayDateKeyInTehran(),
  schedEndDate: addDaysToDateKey(getTodayDateKeyInTehran(), 30),
  schedWeekdays: [],
  schedStartTime: "18:00",
};

const LEVEL_OPTIONS = [
  { value: "all", label: "همه سطوح", emoji: "✨" },
  { value: "beginner", label: "مبتدی", emoji: "🌱" },
  { value: "intermediate", label: "متوسط", emoji: "⚡" },
  { value: "advanced", label: "پیشرفته", emoji: "🔥" },
];

function computeEndTime(startTime) {
  const [h, m] = startTime.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateScheduledSessions(form, venuePayload) {
  const { schedStartDate, schedEndDate, schedWeekdays, schedStartTime } = form;
  if (!schedStartDate || !schedEndDate || schedWeekdays.length === 0 || !schedStartTime) return [];
  const start = parseDateKeyAsUTCNoon(schedStartDate);
  const end = parseDateKeyAsUTCNoon(schedEndDate);
  if (!start || !end || start > end) return [];
  const endTime = computeEndTime(schedStartTime);
  const sessions = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (schedWeekdays.includes(cur.getUTCDay())) {
      sessions.push({ date: formatDateKeyInTehran(cur), startTime: schedStartTime, endTime, ...venuePayload });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return sessions;
}

const SPORT_OPTIONS = [
  { value: "padel", label: "پدل", icon: "🥎" },
  { value: "tennis", label: "تنیس", icon: "🎾" },
  { value: "squash", label: "اسکواش", icon: "🟡" },
  { value: "badminton", label: "بدمینتون", icon: "🏸" },
];

const DATE_OPTIONS = Array.from({ length: 120 }, (_, index) => {
  const value = addDaysToDateKey(getTodayDateKeyInTehran(), index);
  return {
    value,
    label: formatPersianDateInTehran(value, {
      weekday: "short",
      month: "long",
      day: "numeric",
    }),
  };
});

const TIME_OPTIONS = Array.from({ length: 48 }, (_, idx) => {
  const hour = String(Math.floor(idx / 2)).padStart(2, "0");
  const minute = idx % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

function getUserFullName(user) {
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const lastName = typeof user?.lastName === "string" ? user.lastName.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user?.name || "کاربر";
}

function getProfileImage(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

const CLASS_STATUS_META = {
  active: { label: "فعال", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  completed: { label: "تکمیل شده", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  cancelled: { label: "لغو شده", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

export default function CoachManagementPage() {
  const currentUser = useAtomValue(currentUserAtom);

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classDrawerOpen, setClassDrawerOpen] = useState(false);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentCityFilter, setEnrollmentCityFilter] = useState("all");

  const [capacityInput, setCapacityInput] = useState("");
  const [updatingCapacity, setUpdatingCapacity] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState("");

  const [creatingClass, setCreatingClass] = useState(false);
  const [form, setForm] = useState(initialClassForm);
  const [createClassSheetOpen, setCreateClassSheetOpen] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [classSessions, setClassSessions] = useState([]);
  const [savingCoachProfile, setSavingCoachProfile] = useState(false);
  const [coachProfileSheetOpen, setCoachProfileSheetOpen] = useState(false);
  const [coachProfileForm, setCoachProfileForm] = useState({
    coachHeadline: currentUser?.coachHeadline || "",
    coachExperienceYears: currentUser?.coachExperienceYears ? String(currentUser.coachExperienceYears) : "",
    coachHourlyPrice: currentUser?.coachHourlyPrice ? String(currentUser.coachHourlyPrice) : "",
    coachSpecialties: currentUser?.coachSpecialties || "",
    coachCertifications: currentUser?.coachCertifications || "",
    coachLanguages: currentUser?.coachLanguages || "",
  });
  const [privateSessions, setPrivateSessions] = useState([]);
  const [privateSessionsLoading, setPrivateSessionsLoading] = useState(false);
  const [privateSessionsSheetOpen, setPrivateSessionsSheetOpen] = useState(false);
  const [updatingPrivateSessionId, setUpdatingPrivateSessionId] = useState("");
  const [privateSessionStatusFilter, setPrivateSessionStatusFilter] = useState("all");
  const [privateSessionDateFilter, setPrivateSessionDateFilter] = useState("");
  const [coachReviews, setCoachReviews] = useState([]);
  const [coachReviewsStats, setCoachReviewsStats] = useState({ average: 0, total: 0 });
  const [coachReviewsLoading, setCoachReviewsLoading] = useState(false);
  const [reviewsSheetOpen, setReviewsSheetOpen] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySavingId, setReplySavingId] = useState("");

  const isCoach = Boolean(currentUser?.isCoach);

  const selectedClass = useMemo(() => {
    return classes.find((cls) => cls.id === selectedClassId) ?? null;
  }, [classes, selectedClassId]);

  const filteredEnrollments = useMemo(() => {
    const query = enrollmentSearch.trim().toLowerCase();
    return enrollments.filter((item) => {
      const fullName = getUserFullName(item).toLowerCase();
      const byQuery =
        !query ||
        fullName.includes(query) ||
        String(item.phone || "").toLowerCase().includes(query) ||
        String(item.city || "").toLowerCase().includes(query);
      const byCity = enrollmentCityFilter === "all" || (item.city || "نامشخص") === enrollmentCityFilter;
      return byQuery && byCity;
    });
  }, [enrollments, enrollmentSearch, enrollmentCityFilter]);

  const enrollmentCityOptions = useMemo(() => {
    return Array.from(new Set(enrollments.map((item) => item.city || "نامشخص"))).filter(Boolean);
  }, [enrollments]);

  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalParticipants = classes.reduce((sum, item) => sum + Number(item.enrolledCount ?? 0), 0);
    const pendingPrivateSessions = privateSessions.filter((item) => item.status === "pending").length;
    const pendingReplies = coachReviews.filter((item) => !item.coachReply).length;
    return { totalClasses, totalParticipants, pendingPrivateSessions, pendingReplies };
  }, [classes, privateSessions, coachReviews]);

  const filteredPrivateSessions = useMemo(() => {
    return privateSessions.filter((session) => {
      const byStatus = privateSessionStatusFilter === "all" || session.status === privateSessionStatusFilter;
      const byDate = !privateSessionDateFilter || session.date === privateSessionDateFilter;
      return byStatus && byDate;
    });
  }, [privateSessions, privateSessionStatusFilter, privateSessionDateFilter]);

  const selectedClub = useMemo(() => clubs.find((item) => item.id === form.clubId) ?? null, [clubs, form.clubId]);
  const availableCourts = useMemo(
    () => (selectedClub?.courts ?? []).filter((court) => court.isActive !== false),
    [selectedClub]
  );

  const loadClasses = async () => {
    if (!currentUser?.id || !isCoach) return;
    setLoading(true);
    const { ok, data } = await coachService.getMyClasses();
    if (!ok) {
      toast.error(data?.message ?? "خطا در دریافت کلاس‌های مربی");
      setLoading(false);
      return;
    }
    const nextClasses = Array.isArray(data?.classes) ? data.classes : [];
    setClasses(nextClasses);
    if (nextClasses.length > 0) {
      setSelectedClassId((prev) => prev || nextClasses[0].id);
    } else {
      setSelectedClassId("");
      setEnrollments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
  }, [currentUser?.id, isCoach]);

  useEffect(() => {
    if (!createClassSheetOpen || clubs.length > 0) return;
    setClubsLoading(true);
    apiClient
      .get("/public/clubs")
      .then((res) => setClubs(res.ok ? (res.data?.clubs ?? []) : []))
      .catch(() => setClubs([]))
      .finally(() => setClubsLoading(false));
  }, [createClassSheetOpen, clubs.length]);

  useEffect(() => {
    if (!createClassSheetOpen) {
      setForm(initialClassForm);
      setClassSessions([]);
    }
  }, [createClassSheetOpen]);

  useEffect(() => {
    const venuePayload =
      form.venueMode === "platform"
        ? {
            venueMode: "platform",
            clubId: form.clubId,
            courtId: form.courtId,
            clubName: selectedClub?.name || "",
            courtName: availableCourts.find((c) => c.id === form.courtId)?.name || "",
          }
        : {
            venueMode: "custom",
            location: form.customLocation.trim(),
            courtName: form.customCourtName.trim(),
          };
    setClassSessions(generateScheduledSessions(form, venuePayload));
  }, [
    form.schedStartDate, form.schedEndDate, form.schedWeekdays, form.schedStartTime,
    form.venueMode, form.clubId, form.courtId, form.customLocation, form.customCourtName,
    selectedClub, availableCourts,
  ]);

  useEffect(() => {
    if (!isCoach) return;
    setCoachProfileForm({
      coachHeadline: currentUser?.coachHeadline || "",
      coachExperienceYears: currentUser?.coachExperienceYears ? String(currentUser.coachExperienceYears) : "",
      coachHourlyPrice: currentUser?.coachHourlyPrice ? String(currentUser.coachHourlyPrice) : "",
      coachSpecialties: currentUser?.coachSpecialties || "",
      coachCertifications: currentUser?.coachCertifications || "",
      coachLanguages: currentUser?.coachLanguages || "",
    });
  }, [currentUser?.coachHeadline, currentUser?.coachExperienceYears, currentUser?.coachHourlyPrice, currentUser?.coachSpecialties, currentUser?.coachCertifications, currentUser?.coachLanguages, isCoach]);

  useEffect(() => {
    const loadPrivateSessions = async () => {
      if (!isCoach) return;
      setPrivateSessionsLoading(true);
      const { ok, data } = await coachService.getMyPrivateSessions();
      if (!ok) {
        setPrivateSessionsLoading(false);
        return;
      }
      setPrivateSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      setPrivateSessionsLoading(false);
    };

    loadPrivateSessions();
  }, [isCoach]);

  useEffect(() => {
    const loadCoachReviews = async () => {
      if (!isCoach) return;
      setCoachReviewsLoading(true);
      const { ok, data } = await coachService.getMyCoachReviews();
      if (ok) {
        const rows = Array.isArray(data?.reviews) ? data.reviews : [];
        setCoachReviews(rows);
        setCoachReviewsStats(data?.stats ?? { average: 0, total: 0 });
        setReplyDrafts(
          rows.reduce((acc, item) => {
            acc[item.id] = item.coachReply || "";
            return acc;
          }, {})
        );
      }
      setCoachReviewsLoading(false);
    };

    loadCoachReviews();
  }, [isCoach]);

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!selectedClassId || !classDrawerOpen) {
        setEnrollments([]);
        return;
      }
      setEnrollmentsLoading(true);
      const { ok, data } = await coachService.getClassEnrollments(selectedClassId);
      if (!ok) {
        toast.error(data?.message ?? "خطا در دریافت لیست ثبت‌نامی‌ها");
        setEnrollmentsLoading(false);
        return;
      }
      setEnrollments(Array.isArray(data?.enrollments) ? data.enrollments : []);
      setEnrollmentsLoading(false);
    };

    loadEnrollments();
  }, [selectedClassId, classDrawerOpen]);

  useEffect(() => {
    if (!selectedClass) {
      setCapacityInput("");
      return;
    }
    setCapacityInput(String(selectedClass.capacity ?? ""));
    setEnrollmentSearch("");
    setEnrollmentCityFilter("all");
  }, [selectedClass]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreatingClass(true);

    if (classSessions.length === 0) {
      setCreatingClass(false);
      toast.error("حداقل یک جلسه برای کلاس اضافه کنید");
      return;
    }

    if (form.venueMode === "platform" && (!form.clubId || !form.courtId)) {
      setCreatingClass(false);
      toast.error("باشگاه و زمین را انتخاب کنید");
      return;
    }

    if (form.venueMode === "custom" && !form.customLocation.trim()) {
      setCreatingClass(false);
      toast.error("آدرس محل برگزاری را وارد کنید");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      sportType: form.sportType,
      city: form.city,
      level: form.level,
      price: form.price,
      capacity: form.capacity,
      sessions: classSessions,
    };

    const { ok, data } = await coachService.createClass(payload);
    setCreatingClass(false);
    if (!ok) {
      toast.error(data?.message ?? "خطا در ایجاد کلاس");
      return;
    }

    toast.success("کلاس جدید با موفقیت ساخته شد");
    setForm(initialClassForm);
    setClassSessions([]);
    setCreateClassSheetOpen(false);
    await loadClasses();
  };


  const handleSaveCoachProfile = async (e) => {
    e.preventDefault();
    setSavingCoachProfile(true);
    const { ok, data } = await coachService.updateCoachProfile({
      coachHeadline: coachProfileForm.coachHeadline,
      coachExperienceYears: coachProfileForm.coachExperienceYears,
      coachHourlyPrice: coachProfileForm.coachHourlyPrice,
      coachSpecialties: coachProfileForm.coachSpecialties,
      coachCertifications: coachProfileForm.coachCertifications,
      coachLanguages: coachProfileForm.coachLanguages,
    });
    setSavingCoachProfile(false);

    if (!ok) {
      toast.error(data?.message ?? "ذخیره اطلاعات مربی انجام نشد");
      return;
    }
    toast.success("پروفایل مربی بروزرسانی شد");
    setCoachProfileSheetOpen(false);
  };

  const handleUpdatePrivateSessionStatus = async (sessionId, status) => {
    setUpdatingPrivateSessionId(sessionId + status);
    const { ok, data } = await coachService.updatePrivateSession(sessionId, { status });
    setUpdatingPrivateSessionId("");
    if (!ok) {
      toast.error(data?.message ?? "بروزرسانی وضعیت جلسه انجام نشد");
      return;
    }
    setPrivateSessions((prev) => prev.map((item) => (item.id === sessionId ? { ...item, status: data?.session?.status || status } : item)));
    toast.success("وضعیت جلسه خصوصی بروزرسانی شد");
  };

  const handleReplyCoachReview = async (reviewId) => {
    const reply = (replyDrafts[reviewId] || "").trim();
    setReplySavingId(reviewId);
    const { ok, data } = await coachService.replyCoachReview(reviewId, { reply: reply || null });
    setReplySavingId("");
    if (!ok) {
      toast.error(data?.message ?? "ذخیره پاسخ انجام نشد");
      return;
    }
    setCoachReviews((prev) => prev.map((item) => (
      item.id === reviewId
        ? {
            ...item,
            coachReply: data?.review?.coachReply ?? reply,
            coachRepliedAt: data?.review?.coachRepliedAt ?? (reply ? new Date().toISOString() : null),
          }
        : item
    )));
    toast.success(reply ? "پاسخ ثبت شد" : "پاسخ حذف شد");
  };

  const openClassDrawer = (classId) => {
    setSelectedClassId(classId);
    setClassDrawerOpen(true);
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedClass) return;
    if (selectedClass.status === status) return;

    setUpdatingStatus(status);
    const { ok, data } = await coachService.updateClass(selectedClass.id, { status });
    setUpdatingStatus("");

    if (!ok) {
      toast.error(data?.message ?? "ویرایش وضعیت کلاس انجام نشد");
      return;
    }

    toast.success("وضعیت کلاس بروزرسانی شد");
    await loadClasses();
  };

  const handleUpdateCapacity = async () => {
    if (!selectedClass) return;
    if (!capacityInput.trim()) {
      toast.error("ظرفیت را وارد کنید");
      return;
    }

    const parsed = Number.parseInt(capacityInput, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error("ظرفیت نامعتبر است");
      return;
    }

    if (parsed === Number(selectedClass.capacity)) {
      toast("ظرفیت تغییری نکرد");
      return;
    }

    setUpdatingCapacity(true);
    const { ok, data } = await coachService.updateClass(selectedClass.id, { capacity: parsed });
    setUpdatingCapacity(false);

    if (!ok) {
      toast.error(data?.message ?? "ویرایش ظرفیت کلاس انجام نشد");
      return;
    }

    toast.success("ظرفیت کلاس بروزرسانی شد");
    await loadClasses();
  };

  if (!isCoach) {
    return (
      <div className="px-4 py-8" dir="rtl">
        <div className="rounded-3xl border border-border bg-card p-6 text-center space-y-2">
          <p className="text-base font-black text-foreground">پنل مدیریت مربی</p>
          <p className="text-sm text-muted-foreground">این بخش فقط برای حساب‌های مربی فعال است.</p>
          <Link to="/coaches" className="inline-flex items-center gap-1 text-primary text-sm font-bold">
            بازگشت به لیست مربی‌ها
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 sm:px-4 space-y-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/15 via-background to-background p-5"
      >
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-primary/80">Coach Studio</p>
            <h1 className="mt-1 text-xl font-black text-foreground">پنل مدیریت مربی</h1>
            <p className="mt-1 text-xs text-muted-foreground">اینجا می‌تونی کلاس بسازی و ثبت‌نامی‌ها رو مدیریت کنی</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">{getUserFullName(currentUser)}</p>
            <p className="text-[11px] text-primary font-bold">حساب مربی فعال</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[11px] text-muted-foreground">کلاس‌های فعال</p>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.totalClasses}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[11px] text-muted-foreground">کل ثبت‌نامی‌ها</p>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.totalParticipants}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setCreateClassSheetOpen(true)}
          className="rounded-2xl border border-border bg-card px-2 py-3 text-center space-y-1"
        >
          <PlusIcon className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[11px] font-black text-foreground">افزودن کلاس</p>
        </button>
        <button
          type="button"
          onClick={() => setCoachProfileSheetOpen(true)}
          className="rounded-2xl border border-border bg-card px-2 py-3 text-center space-y-1"
        >
          <UserRoundPenIcon className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[11px] font-black text-foreground">پروفایل مربی</p>
        </button>
        <button
          type="button"
          onClick={() => setPrivateSessionsSheetOpen(true)}
          className="rounded-2xl border border-border bg-card px-2 py-3 text-center space-y-1"
        >
          <CalendarDaysIcon className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[11px] font-black text-foreground">جلسات خصوصی</p>
        </button>
        <button
          type="button"
          onClick={() => setReviewsSheetOpen(true)}
          className="rounded-2xl border border-border bg-card px-2 py-3 text-center space-y-1"
        >
          <MessageSquareIcon className="w-4 h-4 text-primary mx-auto" />
          <p className="text-[11px] font-black text-foreground">نظرات</p>
          {stats.pendingReplies > 0 ? (
            <p className="text-[10px] text-rose-600 font-bold">{stats.pendingReplies} بی‌پاسخ</p>
          ) : null}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-foreground">لیست کلاس‌های من</p>
          <Link to="/coaches" className="text-xs text-primary font-bold">مشاهده صفحه عمومی مربی‌ها</Link>
        </div>

        {loading ? (
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز کلاسی نساختی.</p>
        ) : (
          <div className="space-y-2.5">
            {classes.map((cls) => {
              const meta = CLASS_STATUS_META[cls.status] ?? CLASS_STATUS_META.active;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => openClassDrawer(cls.id)}
                  className="w-full text-right rounded-2xl border border-border bg-background px-3 py-3 transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground truncate">{cls.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{cls.city || "نامشخص"} • {cls.sportType}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full font-bold", meta.className)}>{meta.label}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><UsersIcon className="w-3 h-3" />{cls.enrolledCount ?? 0}/{cls.capacity}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" />{Array.isArray(cls.sessions) ? cls.sessions.length : 0} جلسه</span>
                    <span className="font-bold text-primary">{Number(cls.price || 0).toLocaleString("fa-IR")} ت</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomSheet
        open={classDrawerOpen}
        onDismiss={() => setClassDrawerOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.9, 780)]}
      >
        <div className="bg-[#fbfaf8] dark:bg-background text-foreground min-h-[62vh] px-4 pt-4 pb-6" dir="rtl">
          <div className="relative overflow-hidden rounded-[24px] border border-white/80 dark:border-white/10 bg-white/90 dark:bg-card/80 px-4 py-4 shadow-xl shadow-slate-200/60 dark:shadow-black/20 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setClassDrawerOpen(false)}
              className="absolute left-3 top-3 h-8 w-8 rounded-xl border border-border bg-background/80 flex items-center justify-center"
            >
              <XIcon className="w-4 h-4" />
            </button>

            {!selectedClass ? (
              <p className="text-sm text-muted-foreground">کلاسی انتخاب نشده است.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-black text-foreground">{selectedClass.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{selectedClass.city || "نامشخص"} • {selectedClass.sportType}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full font-bold", (CLASS_STATUS_META[selectedClass.status] ?? CLASS_STATUS_META.active).className)}>
                      {(CLASS_STATUS_META[selectedClass.status] ?? CLASS_STATUS_META.active).label}
                    </span>
                  </div>

                  {selectedClass.description && (
                    <p className="mt-2 text-xs text-muted-foreground leading-6">{selectedClass.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("completed")}
                    disabled={updatingStatus === "completed" || selectedClass.status === "completed"}
                    className="h-10 rounded-xl bg-sky-600 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1"
                  >
                    <CheckCircle2Icon className="w-4 h-4" />
                    {updatingStatus === "completed" ? "..." : "تکمیل کلاس"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("cancelled")}
                    disabled={updatingStatus === "cancelled" || selectedClass.status === "cancelled"}
                    className="h-10 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    {updatingStatus === "cancelled" ? "..." : "لغو کلاس"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("active")}
                    disabled={updatingStatus === "active" || selectedClass.status === "active"}
                    className="col-span-2 h-10 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-bold disabled:opacity-50"
                  >
                    {updatingStatus === "active" ? "..." : "بازگشت به فعال"}
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-background p-3 space-y-2">
                  <p className="text-xs font-black text-foreground">مدیریت ظرفیت لحظه‌ای</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={capacityInput}
                      onChange={(e) => setCapacityInput(e.target.value)}
                      className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm"
                      placeholder="ظرفیت جدید"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateCapacity}
                      disabled={updatingCapacity}
                      className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-black disabled:opacity-50"
                    >
                      {updatingCapacity ? "..." : "ثبت"}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">ثبت‌نام فعال: {selectedClass.enrolledCount ?? 0} نفر</p>
                </div>

                {Array.isArray(selectedClass.sessions) && selectedClass.sessions.length > 0 && (
                  <div className="rounded-2xl border border-border bg-background p-3 space-y-1.5">
                    <p className="text-xs font-black text-foreground">جلسات کلاس</p>
                    {selectedClass.sessions.slice(0, 6).map((s, idx) => (
                      <div key={`${s.date}-${s.startTime}-${idx}`} className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        <span>{s.date}</span>
                        <Clock3Icon className="w-3.5 h-3.5 mr-1" />
                        <span>{s.startTime} تا {s.endTime}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-background p-3 space-y-2">
                  <p className="text-xs font-black text-foreground">شرکت‌کننده‌ها</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={enrollmentSearch}
                      onChange={(e) => setEnrollmentSearch(e.target.value)}
                      className="col-span-2 h-10 rounded-xl border border-border bg-card px-3 text-sm"
                      placeholder="جستجو: اسم، شماره، شهر"
                    />
                    <select
                      value={enrollmentCityFilter}
                      onChange={(e) => setEnrollmentCityFilter(e.target.value)}
                      className="col-span-2 h-10 rounded-xl border border-border bg-card px-3 text-sm"
                    >
                      <option value="all">همه شهرها</option>
                      {enrollmentCityOptions.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  {enrollmentsLoading ? (
                    <div className="h-20 rounded-xl bg-muted animate-pulse" />
                  ) : filteredEnrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">شرکت‌کننده‌ای پیدا نشد.</p>
                  ) : (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {filteredEnrollments.map((item) => {
                        const fullName = getUserFullName(item);
                        const imageSrc = getProfileImage(item.image);
                        return (
                          <div key={item.id} className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden shrink-0">
                                {imageSrc ? (
                                  <img src={imageSrc} alt={fullName} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs font-black text-muted-foreground">{fullName?.[0] ?? "U"}</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{fullName}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{item.phone || item.city || "—"}</p>
                              </div>
                            </div>
                            <span className="text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("fa-IR")}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={createClassSheetOpen}
        onDismiss={() => setCreateClassSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.88, 760)]}
      >
        <div className="bg-[#fbfaf8] dark:bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          <form onSubmit={handleCreateClass} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-foreground">
              <PlusIcon className="w-4 h-4 text-primary" />
              ایجاد کلاس جدید
            </div>

            <div className="grid grid-cols-2 gap-2">
              {SPORT_OPTIONS.map((option) => {
                const active = form.sportType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, sportType: option.value }))}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-bold transition",
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"
                    )}
                  >
                    <span className="ml-1">{option.icon}</span>
                    {option.label}
                  </button>
                );
              })}
            </div>

            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="عنوان کلاس"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              required
            />

            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="توضیحات"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              rows={3}
            />

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground">سطح کلاس</p>
              <div className="grid grid-cols-4 gap-1.5">
                {LEVEL_OPTIONS.map((option) => {
                  const active = form.level === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, level: option.value }))}
                      className={cn(
                        "h-10 rounded-xl border text-[11px] font-bold transition",
                        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"
                      )}
                    >
                      <span className="ml-0.5">{option.emoji}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="شهر"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
              <input
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="قیمت (تومان)"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                required
              />
              <input
                value={form.capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
                placeholder="ظرفیت"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, venueMode: "platform", customLocation: "", customCourtName: "" }))}
                className={cn(
                  "h-9 rounded-lg text-xs font-bold transition",
                  form.venueMode === "platform" ? "bg-background text-primary" : "text-muted-foreground"
                )}
              >
                باشگاه‌های سیستم
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, venueMode: "custom", clubId: "", courtId: "" }))}
                className={cn(
                  "h-9 rounded-lg text-xs font-bold transition",
                  form.venueMode === "custom" ? "bg-background text-primary" : "text-muted-foreground"
                )}
              >
                محل دلخواه
              </button>
            </div>

            {form.venueMode === "platform" ? (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.clubId}
                  onChange={(e) => setForm((prev) => ({ ...prev, clubId: e.target.value, courtId: "" }))}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">{clubsLoading ? "در حال دریافت باشگاه‌ها..." : "انتخاب باشگاه"}</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <select
                  value={form.courtId}
                  onChange={(e) => setForm((prev) => ({ ...prev, courtId: e.target.value }))}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                  disabled={!form.clubId}
                >
                  <option value="">انتخاب زمین</option>
                  {availableCourts.map((court) => (
                    <option key={court.id} value={court.id}>{court.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.customLocation}
                  onChange={(e) => setForm((prev) => ({ ...prev, customLocation: e.target.value }))}
                  placeholder="آدرس محل برگزاری"
                  className="col-span-2 h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  value={form.customCourtName}
                  onChange={(e) => setForm((prev) => ({ ...prev, customCourtName: e.target.value }))}
                  placeholder="نام زمین (اختیاری)"
                  className="col-span-2 h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
            )}

            <div className="rounded-xl border border-border bg-background p-3 space-y-3">
              <p className="text-xs font-black text-foreground">زمان‌بندی جلسات</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">تاریخ شروع</p>
                  <select
                    value={form.schedStartDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, schedStartDate: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-card px-2 text-xs"
                  >
                    {DATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">تاریخ پایان</p>
                  <select
                    value={form.schedEndDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, schedEndDate: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-card px-2 text-xs"
                  >
                    {DATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">روزهای هفته</p>
                <div className="flex flex-wrap gap-1.5">
                  {PERSIAN_WEEKDAYS.map((day) => {
                    const active = form.schedWeekdays.includes(day.utcDay);
                    return (
                      <button
                        key={day.utcDay}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            schedWeekdays: active
                              ? prev.schedWeekdays.filter((d) => d !== day.utcDay)
                              : [...prev.schedWeekdays, day.utcDay],
                          }))
                        }
                        className={cn(
                          "h-8 px-2.5 rounded-lg border text-[11px] font-bold transition",
                          active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">ساعت شروع</p>
                  <select
                    value={form.schedStartTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, schedStartTime: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-card px-2 text-xs"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">ساعت پایان (خودکار)</p>
                  <div className="h-10 w-full rounded-xl border border-border bg-muted px-3 flex items-center text-xs font-bold text-foreground">
                    {computeEndTime(form.schedStartTime)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black text-foreground">
                    {classSessions.length > 0
                      ? `${classSessions.length} جلسه تولید شد`
                      : "جلسه‌ای تولید نشده"}
                  </p>
                  {classSessions.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatPersianDateInTehran(classSessions[0].date, { month: "short", day: "numeric" })}
                      {" — "}
                      {formatPersianDateInTehran(classSessions[classSessions.length - 1].date, { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {classSessions.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">روزهای هفته و بازه تاریخ را انتخاب کن</p>
                  ) : (
                    classSessions.map((session, idx) => (
                      <div
                        key={`${session.date}-${idx}`}
                        className="rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between gap-2"
                      >
                        <span>
                          {formatPersianDateInTehran(session.date, { weekday: "short", month: "short", day: "numeric" })}
                          {" • "}{session.startTime}–{session.endTime}
                        </span>
                        <button
                          type="button"
                          onClick={() => setClassSessions((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 font-bold text-[11px]"
                        >
                          حذف
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingClass}
              className="h-10 w-full rounded-xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-50"
            >
              {creatingClass ? "در حال ثبت..." : "ساخت کلاس"}
            </button>
          </form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={coachProfileSheetOpen}
        onDismiss={() => setCoachProfileSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.88, 760)]}
      >
        <div className="bg-[#fbfaf8] dark:bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          <form onSubmit={handleSaveCoachProfile} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-foreground">
              <UserRoundPenIcon className="w-4 h-4 text-primary" />
              تکمیل پروفایل حرفه‌ای مربی
            </div>

            <input
              value={coachProfileForm.coachHeadline}
              onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachHeadline: e.target.value }))}
              placeholder="تیتر معرفی کوتاه"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={coachProfileForm.coachExperienceYears}
                onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachExperienceYears: e.target.value }))}
                placeholder="سال تجربه"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                inputMode="numeric"
              />
              <input
                value={coachProfileForm.coachHourlyPrice}
                onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachHourlyPrice: e.target.value }))}
                placeholder="قیمت هر جلسه (تومان)"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                inputMode="numeric"
              />
            </div>
            <textarea
              rows={2}
              value={coachProfileForm.coachSpecialties}
              onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachSpecialties: e.target.value }))}
              placeholder="تخصص‌ها"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              value={coachProfileForm.coachCertifications}
              onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachCertifications: e.target.value }))}
              placeholder="مدارک و گواهی‌ها"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={coachProfileForm.coachLanguages}
              onChange={(e) => setCoachProfileForm((prev) => ({ ...prev, coachLanguages: e.target.value }))}
              placeholder="زبان‌ها (مثلاً فارسی، انگلیسی)"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
            <button
              type="submit"
              disabled={savingCoachProfile}
              className="h-10 w-full rounded-xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-50"
            >
              {savingCoachProfile ? "در حال ذخیره..." : "ذخیره پروفایل مربی"}
            </button>
          </form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={privateSessionsSheetOpen}
        onDismiss={() => setPrivateSessionsSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.9, 760)]}
      >
        <div className="bg-[#fbfaf8] dark:bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-foreground">درخواست‌های جلسه خصوصی</p>
              <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">{stats.pendingPrivateSessions} در انتظار</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={privateSessionStatusFilter}
                onChange={(e) => setPrivateSessionStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending">در انتظار</option>
                <option value="confirmed">تایید شده</option>
                <option value="completed">انجام شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
              <select
                value={privateSessionDateFilter}
                onChange={(e) => setPrivateSessionDateFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="">همه تاریخ‌ها</option>
                {DATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {privateSessionsLoading ? (
              <div className="h-20 rounded-xl bg-muted animate-pulse" />
            ) : filteredPrivateSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">جلسه‌ای با فیلترهای فعلی پیدا نشد.</p>
            ) : (
              <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
                {filteredPrivateSessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">{getUserFullName(session.user)}</p>
                      {session.status === "confirmed" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">تایید شده</span>
                      )}
                      {session.status === "cancelled" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">لغو شده</span>
                      )}
                      {session.status === "pending" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">در انتظار</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>{formatPersianDateInTehran(session.date, { weekday: "short", month: "long", day: "numeric" })}</span>
                      <span>•</span>
                      <span>{session.startTime}–{session.endTime}</span>
                      {session.location && <><span>•</span><span>{session.location}</span></>}
                    </div>
                    {session.notes && (
                      <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">{session.notes}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">{session.user?.phone || "بدون شماره"}</p>
                    {session.status === "pending" && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivateSessionStatus(session.id, "confirmed")}
                          disabled={updatingPrivateSessionId === session.id + "confirmed"}
                          className="h-9 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50"
                        >
                          {updatingPrivateSessionId === session.id + "confirmed" ? "..." : "تایید"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivateSessionStatus(session.id, "cancelled")}
                          disabled={updatingPrivateSessionId === session.id + "cancelled"}
                          className="h-9 rounded-xl bg-rose-600 text-white text-xs font-black disabled:opacity-50"
                        >
                          {updatingPrivateSessionId === session.id + "cancelled" ? "..." : "لغو"}
                        </button>
                      </div>
                    )}
                    {session.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => handleUpdatePrivateSessionStatus(session.id, "cancelled")}
                        disabled={updatingPrivateSessionId === session.id + "cancelled"}
                        className="h-9 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black disabled:opacity-50"
                      >
                        {updatingPrivateSessionId === session.id + "cancelled" ? "..." : "لغو جلسه"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={reviewsSheetOpen}
        onDismiss={() => setReviewsSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.9, 760)]}
      >
        <div className="bg-[#fbfaf8] dark:bg-background text-foreground px-4 pt-4 pb-6" dir="rtl">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-foreground">نظرات کاربران</p>
              <div className="text-left">
                <p className="text-sm font-black text-foreground">{coachReviewsStats.average || "0.0"}</p>
                <p className="text-[10px] text-muted-foreground">{coachReviewsStats.total || 0} نظر</p>
              </div>
            </div>

            {coachReviewsLoading ? (
              <div className="h-20 rounded-xl bg-muted animate-pulse" />
            ) : coachReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز نظری ثبت نشده.</p>
            ) : (
              <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
                {coachReviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{getUserFullName(review.user)}</p>
                        <p className="text-[11px] text-muted-foreground">{review.user?.phone || "بدون شماره"}</p>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <StarIcon key={`${review.id}-${idx}`} className={cn("w-3.5 h-3.5", idx < Number(review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                    </div>

                    {review.comment ? (
                      <p className="text-xs text-muted-foreground leading-5">{review.comment}</p>
                    ) : null}

                    <textarea
                      rows={2}
                      value={replyDrafts[review.id] || ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                      placeholder="پاسخ شما به این نظر..."
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => handleReplyCoachReview(review.id)}
                      disabled={replySavingId === review.id}
                      className="h-9 w-full rounded-xl bg-primary text-primary-foreground text-xs font-black inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <SendIcon className="w-3.5 h-3.5" />
                      {replySavingId === review.id ? "در حال ذخیره..." : "ذخیره پاسخ"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
