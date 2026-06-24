import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  XIcon,
  CalendarDaysIcon,
  Clock3Icon,
  UsersIcon,
  MapPinIcon,
  CheckCircle2Icon,
  Loader2Icon,
  WalletIcon,
  TicketIcon,
  SparklesIcon,
  TargetIcon,
  LayersIcon,
  ShieldCheckIcon,
  ListChecksIcon,
  DumbbellIcon,
  UserCircle2Icon,
  TrophyIcon,
  StarIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { coachService } from "@/services/coachService";
import { walletService } from "@/features/wallet/walletService";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/config/state";

const LEVEL_LABELS = {
  all: "✨ همه سطوح",
  beginner: "🌱 مبتدی",
  intermediate: "⚡ متوسط",
  advanced: "🔥 پیشرفته",
};

const SPORT_LABELS = {
  padel: "🥎 پدل",
  tennis: "🎾 تنیس",
  squash: "🟡 اسکواش",
  badminton: "🏸 بدمینتون",
  "ping-pong": "🏓 پینگ‌پنگ",
};

const LEVEL_COLORS = {
  all: "from-violet-500 to-purple-600",
  beginner: "from-emerald-500 to-teal-600",
  intermediate: "from-amber-500 to-orange-600",
  advanced: "from-rose-500 to-red-600",
};

const SPORT_GRADIENTS = {
  tennis: "from-[#1a6b3c] to-[#16a34a]",
  padel: "from-[#1e3a8a] to-[#3b82f6]",
  squash: "from-[#7c2d12] to-[#f59e0b]",
  badminton: "from-[#4c1d95] to-[#a78bfa]",
  "ping-pong": "from-[#134e4a] to-[#2dd4bf]",
};

function formatClassDate(dateKey) {
  if (!dateKey) return "—";
  try {
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString("fa-IR", {
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateKey;
  }
}

function formatToman(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function getProfileImage(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

function InfoRow({ icon: Icon, label, value, accent = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? "bg-primary/10" : "bg-muted"}`}>
          <Icon className={`w-3.5 h-3.5 ${accent ? "text-primary" : ""}`} />
        </div>
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-bold text-foreground text-left">{value}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h3 className="text-sm font-black text-foreground">{children}</h3>
    </div>
  );
}

export default function ClassDetailSheet({ cls, coachName, coachImage, open, onClose, isOwnCoach = false }) {
  const currentUser = useAtomValue(currentUserAtom);
  const [enrollSheetOpen, setEnrollSheetOpen] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (!open) {
      setEnrollSheetOpen(false);
      setReceipt(null);
    }
  }, [open]);

  if (!cls) return null;

  const price = Number(cls.price ?? 0);
  const isFull = Number(cls.enrolledCount) >= Number(cls.capacity);
  const sessionsCount = cls.sessionsCount ?? (Array.isArray(cls.sessions) ? cls.sessions.length : 0);
  const sportGrad = SPORT_GRADIENTS[cls.sportType] ?? "from-primary to-primary/70";
  const levelGrad = LEVEL_COLORS[cls.level] ?? "from-primary to-primary/70";

  const handleOpenEnroll = async () => {
    if (!currentUser) {
      toast.error("برای ثبت‌نام ابتدا وارد شوید");
      return;
    }
    setReceipt(null);
    setEnrollSheetOpen(true);
    if (price > 0) {
      setWalletLoading(true);
      const { ok, data } = await walletService.getWallet();
      setWallet(ok ? data?.wallet ?? null : null);
      setWalletLoading(false);
    }
  };

  const handleConfirmEnroll = async () => {
    const balance = Number(wallet?.balance ?? 0);
    if (price > 0 && balance < price) {
      toast.error("موجودی کیف پول کافی نیست");
      return;
    }
    setEnrolling(true);
    const { ok, data } = await coachService.enrollClass(cls.id, {
      paymentMethod: price > 0 ? "wallet" : "none",
    });
    setEnrolling(false);
    if (!ok) {
      toast.error(data?.message ?? "ثبت‌نام انجام نشد");
      return;
    }
    setWallet(data?.wallet ?? wallet);
    setReceipt(data?.receipt ?? { trackingCode: "—", amountPaid: price, title: cls.title });
    toast.success("ثبت‌نام کلاس انجام شد");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[80] flex justify-center"
            style={{ maxHeight: "94dvh" }}
          >
            <div
              className="w-full max-w-[480px] bg-background rounded-t-[28px] overflow-hidden flex flex-col"
              style={{ maxHeight: "94dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Hero banner */}
              <div className={`relative h-44 shrink-0 bg-gradient-to-br ${sportGrad} overflow-hidden`}>
                {/* Pattern */}
                {[
                  { top: "10%", left: "8%", size: 60, rotate: -18, opacity: 0.12 },
                  { top: "40%", left: "55%", size: 90, rotate: 12, opacity: 0.08 },
                  { top: "60%", left: "15%", size: 40, rotate: 25, opacity: 0.10 },
                  { top: "15%", left: "80%", size: 50, rotate: -8, opacity: 0.11 },
                ].map((p, i) => (
                  <span
                    key={i}
                    className="absolute select-none pointer-events-none leading-none"
                    style={{ top: p.top, left: p.left, fontSize: p.size, opacity: p.opacity, transform: `rotate(${p.rotate}deg)` }}
                  >
                    {SPORT_LABELS[cls.sportType]?.split(" ")[0] ?? "🎾"}
                  </span>
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                {/* Close */}
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
                >
                  <XIcon className="w-4 h-4" />
                </button>

                {/* Level badge */}
                <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r ${levelGrad} text-white text-[11px] font-black`}>
                  {LEVEL_LABELS[cls.level] ?? "✨ همه سطوح"}
                </div>

                {/* Bottom content */}
                <div className="absolute bottom-0 inset-x-0 px-4 pb-4">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-black text-white leading-tight line-clamp-2">{cls.title || "کلاس ورزشی"}</h2>
                      <p className="mt-1 text-xs text-white/75">{SPORT_LABELS[cls.sportType] ?? "ورزش"} • {cls.city || "نامشخص"}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-lg font-black text-white">{price > 0 ? `${formatToman(price)}` : "رایگان"}</p>
                      {price > 0 && <p className="text-[10px] text-white/70">تومان</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto no-scrollbar" dir="rtl">
                <div className="px-4 pt-4 pb-6 space-y-4">

                  {/* Coach info */}
                  {coachName && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 border border-border">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted shrink-0">
                        {coachImage ? (
                          <img src={getProfileImage(coachImage)} alt={coachName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base font-black text-muted-foreground">
                            {coachName?.[0] ?? "م"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">مربی</p>
                        <p className="text-sm font-black text-foreground">{coachName}</p>
                      </div>
                      <UserCircle2Icon className="w-4 h-4 text-muted-foreground mr-auto" />
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-muted/60 p-3 text-center space-y-1">
                      <UsersIcon className="w-4 h-4 text-primary mx-auto" />
                      <p className="text-sm font-black text-foreground">{cls.enrolledCount ?? 0}/{cls.capacity ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">ظرفیت</p>
                    </div>
                    <div className="rounded-2xl bg-muted/60 p-3 text-center space-y-1">
                      <CalendarDaysIcon className="w-4 h-4 text-primary mx-auto" />
                      <p className="text-sm font-black text-foreground">{sessionsCount || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">جلسه</p>
                    </div>
                    <div className="rounded-2xl bg-muted/60 p-3 text-center space-y-1">
                      <Clock3Icon className="w-4 h-4 text-primary mx-auto" />
                      <p className="text-sm font-black text-foreground">{cls.sessionDurationMinutes ? `${cls.sessionDurationMinutes} دقیقه` : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">مدت هر جلسه</p>
                    </div>
                  </div>

                  {/* Description */}
                  {cls.description && (
                    <div className="space-y-2">
                      <SectionTitle icon={SparklesIcon}>توضیحات کلاس</SectionTitle>
                      <p className="text-xs text-muted-foreground leading-6 bg-muted/40 rounded-2xl p-3">{cls.description}</p>
                    </div>
                  )}

                  {/* Goal */}
                  {cls.goal ? (
                    <div className="space-y-2">
                      <SectionTitle icon={TargetIcon}>هدف کلاس</SectionTitle>
                      <p className="text-xs text-muted-foreground leading-6 bg-muted/40 rounded-2xl p-3">{cls.goal}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <SectionTitle icon={TargetIcon}>هدف کلاس</SectionTitle>
                      <p className="text-xs text-muted-foreground/50 leading-6 bg-muted/20 rounded-2xl p-3 border border-dashed border-border">
                        هدف این کلاس بزودی تکمیل می‌شود.
                      </p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-1">
                    <SectionTitle icon={LayersIcon}>جزئیات کلاس</SectionTitle>
                    <div className="rounded-2xl border border-border bg-card px-3">
                      <InfoRow icon={LayersIcon} label="سطح" value={LEVEL_LABELS[cls.level] ?? "✨ همه سطوح"} accent />
                      <InfoRow icon={MapPinIcon} label="شهر" value={cls.city || "نامشخص"} />
                      <InfoRow icon={CalendarDaysIcon} label="شروع" value={formatClassDate(cls.startDate) || "—"} />
                      <InfoRow icon={CalendarDaysIcon} label="پایان" value={formatClassDate(cls.endDate) || "—"} />
                      <InfoRow icon={UsersIcon} label="ظرفیت" value={`${cls.enrolledCount ?? 0} از ${cls.capacity ?? "—"} نفر`} />
                    </div>
                  </div>

                  {/* Sessions schedule */}
                  {Array.isArray(cls.sessions) && cls.sessions.length > 0 && (
                    <div className="space-y-2">
                      <SectionTitle icon={CalendarDaysIcon}>زمان‌بندی جلسات</SectionTitle>
                      <div className="space-y-1.5">
                        {cls.sessions.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5 text-xs">
                            <span className="text-foreground font-medium">{formatClassDate(s.date)}</span>
                            <span className="text-muted-foreground">{s.startTime} — {s.endTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment */}
                  {cls.equipment ? (
                    <div className="space-y-2">
                      <SectionTitle icon={DumbbellIcon}>تجهیزات موردنیاز</SectionTitle>
                      <div className="rounded-2xl border border-border bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground leading-6">{cls.equipment}</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Benefits */}
                  {Array.isArray(cls.benefits) && cls.benefits.length > 0 ? (
                    <div className="space-y-2">
                      <SectionTitle icon={TrophyIcon}>مزایای شرکت در کلاس</SectionTitle>
                      <div className="space-y-1.5">
                        {cls.benefits.map((b, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                            <CheckCircle2Icon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <SectionTitle icon={TrophyIcon}>مزایای شرکت در کلاس</SectionTitle>
                      <div className="space-y-1.5">
                        {[
                          "بهبود تکنیک و مهارت‌های پایه",
                          "آموزش توسط مربی مجرب و متخصص",
                          "محیط گروهی پویا و انگیزه‌بخش",
                          "پیشرفت مستمر با برنامه آموزشی ساختارمند",
                        ].map((b, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-foreground/60">
                            <CheckCircle2Icon className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rules */}
                  {cls.rules ? (
                    <div className="space-y-2">
                      <SectionTitle icon={ShieldCheckIcon}>قوانین و نکات مهم</SectionTitle>
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <p className="text-xs text-muted-foreground leading-6">{cls.rules}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <SectionTitle icon={ShieldCheckIcon}>قوانین و نکات مهم</SectionTitle>
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
                        {[
                          "حضور به موقع در جلسات الزامی است",
                          "لطفاً تجهیزات مناسب ورزشی بپوشید",
                          "در صورت غیبت، قبلاً اطلاع دهید",
                        ].map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                            <ListChecksIcon className="w-3.5 h-3.5 text-amber-500/60 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spacer for CTA */}
                  <div className="h-2" />
                </div>
              </div>

              {/* CTA */}
              {!isOwnCoach && (
                <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border bg-background" dir="rtl">
                  <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span>هزینه کلاس</span>
                    <span className="font-black text-foreground text-sm">{price > 0 ? `${formatToman(price)} تومان` : "رایگان"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenEnroll}
                    disabled={isFull}
                    className="h-13 w-full rounded-2xl bg-primary text-primary-foreground text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    {isFull ? (
                      "ظرفیت تکمیل شده"
                    ) : (
                      <>
                        <SparklesIcon className="w-4.5 h-4.5" />
                        {price > 0 ? "ثبت‌نام و پرداخت" : "ثبت‌نام رایگان"}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Enroll Confirmation Sheet */}
          <AnimatePresence>
            {enrollSheetOpen && (
              <>
                <motion.div
                  key="enroll-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[90] bg-black/40"
                  onClick={() => setEnrollSheetOpen(false)}
                />
                <motion.div
                  key="enroll-sheet"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 32, stiffness: 340 }}
                  className="fixed inset-x-0 bottom-0 z-[100] flex justify-center"
                >
                  <div
                    className="w-full max-w-[480px] bg-background rounded-t-[24px] px-4 pt-4 pb-8"
                    onClick={(e) => e.stopPropagation()}
                    dir="rtl"
                  >
                    <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />

                    {receipt ? (
                      <div className="space-y-4 text-center">
                        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                          <CheckCircle2Icon className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-base font-black text-foreground">ثبت‌نام با موفقیت انجام شد</p>
                          <p className="mt-1 text-xs text-muted-foreground">{receipt.title || cls.title}</p>
                        </div>
                        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 space-y-2 text-right">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground inline-flex items-center gap-1"><TicketIcon className="w-3.5 h-3.5" /> کد پیگیری</span>
                            <span className="font-black text-foreground">{receipt.trackingCode}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">مبلغ پرداختی</span>
                            <span className="font-bold">{Number(receipt.amountPaid ?? 0) > 0 ? `${formatToman(receipt.amountPaid)} تومان` : "رایگان"}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setEnrollSheetOpen(false); onClose(); }}
                          className="h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-black"
                        >
                          باشه، فهمیدم
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-foreground">تأیید ثبت‌نام</p>
                          <button type="button" onClick={() => setEnrollSheetOpen(false)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center">
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-1">
                          <p className="text-sm font-bold text-foreground">{cls.title}</p>
                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 font-bold">{LEVEL_LABELS[cls.level] ?? "همه سطوح"}</span>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{sessionsCount} جلسه</span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">هزینه</span>
                            <span className="font-black text-foreground">{price > 0 ? `${formatToman(price)} تومان` : "رایگان"}</span>
                          </div>
                          {price > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground inline-flex items-center gap-1"><WalletIcon className="w-3.5 h-3.5" /> موجودی کیف پول</span>
                              <span className={`font-bold ${price > Number(wallet?.balance ?? 0) ? "text-rose-500" : "text-foreground"}`}>
                                {walletLoading ? "..." : `${formatToman(wallet?.balance ?? 0)} تومان`}
                              </span>
                            </div>
                          )}
                        </div>

                        {price > 0 && Number(wallet?.balance ?? 0) < price && !walletLoading && (
                          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
                            <span>موجودی کیف پول کافی نیست.</span>
                            <Link to="/profile" className="font-black underline">شارژ کیف پول</Link>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleConfirmEnroll}
                          disabled={enrolling || (price > 0 && (walletLoading || Number(wallet?.balance ?? 0) < price))}
                          className="h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {enrolling ? (
                            <><Loader2Icon className="w-4 h-4 animate-spin" /> در حال ثبت...</>
                          ) : price > 0 ? (
                            <><WalletIcon className="w-4 h-4" /> پرداخت و ثبت‌نام</>
                          ) : (
                            "ثبت‌نام رایگان"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
