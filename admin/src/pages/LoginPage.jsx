import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneIcon, KeyIcon, LockIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import { adminUserAtom, adminTokenAtom } from "@/store/authStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

// Login modes
const MODE_SELECT   = "select";   // choose OTP or password
const MODE_OTP_PHONE = "otp_phone";
const MODE_OTP_CODE  = "otp_code";
const MODE_PASSWORD  = "password";
const MODE_FORGOT_PHONE = "forgot_phone";   // enter phone for reset
const MODE_FORGOT_OTP   = "forgot_otp";    // enter OTP code
const MODE_FORGOT_NEW   = "forgot_new";    // enter new password

export default function LoginPage() {
  const [mode, setMode]               = useState(MODE_OTP_PHONE);
  const [noPasswordSet, setNoPasswordSet] = useState(false);
  const [phone, setPhone]             = useState("");
  const [otp, setOtp]                 = useState("");
  const [password, setPassword]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const setUser  = useSetAtom(adminUserAtom);
  const setToken = useSetAtom(adminTokenAtom);
  const navigate = useNavigate();

  // countdown timer for OTP resend
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const formatCountdown = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const saveAndRedirect = (data) => {
    localStorage.setItem("raqetzone-admin-token", data.token);
    localStorage.setItem("raqetzone-admin-user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    toast.success("خوش آمدید 👋");
    navigate("/");
  };

  // ── OTP flow ─────────────────────────────────────────────────────────────────

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) return toast.error("شماره تلفن را وارد کنید");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/send-otp", { phone });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ارسال کد");
    toast.success("کد تأیید ارسال شد");
    setMode(MODE_OTP_CODE);
    setResendSeconds(120);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/send-otp", { phone });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ارسال مجدد کد");
    toast.success("کد تأیید مجددا ارسال شد");
    setResendSeconds(120);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error("کد تأیید را وارد کنید");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/verify-otp", { phone, code: otp, isClubOwner: true });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "کد نامعتبر است");
    saveAndRedirect(data);
  };

  // ── Password flow ─────────────────────────────────────────────────────────────

  const handleLoginWithPassword = async (e) => {
    e.preventDefault();
    if (!phone || !password) return toast.error("شماره و رمز عبور را وارد کنید");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/login-password", { phone, password });
    setLoading(false);
    if (!ok) {
      if (data?.message?.includes("تنظیم نشده")) {
        setNoPasswordSet(true);
      } else {
        toast.error(data?.message ?? "ورود ناموفق بود");
      }
      return;
    }

    // Save session first, then redirect
    localStorage.setItem("raqetzone-admin-token", data.token);
    localStorage.setItem("raqetzone-admin-user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    if (data.isDefaultPassword) {
      toast("لطفاً رمز عبور پیش‌فرض را تغییر دهید", { icon: "🔒" });
      navigate("/set-password");
    } else {
      toast.success("خوش آمدید 👋");
      navigate("/");
    }
    return;
  };

  // ── Forgot password flow ──────────────────────────────────────────────────────

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) return toast.error("شماره تلفن را وارد کنید");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/send-otp", { phone });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ارسال کد");
    toast.success("کد تأیید ارسال شد");
    setMode(MODE_FORGOT_OTP);
    setResendSeconds(120);
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error("کد تأیید را وارد کنید");
    // just move to new password step — actual verification happens with reset-password
    setMode(MODE_FORGOT_NEW);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return toast.error("رمز عبور جدید را وارد کنید");
    if (newPassword.length < 8) return toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/reset-password", { phone, code: otp, password: newPassword });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "بازیابی رمز ناموفق بود");
    toast.success("رمز عبور با موفقیت تغییر کرد");
    setOtp("");
    setNewPassword("");
    setMode(MODE_PASSWORD);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src="/logo.png" alt="Raqetzone" className="h-16 w-16 rounded-2xl object-contain shadow-lg" />
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground">رکت‌زون</h1>
            <p className="text-muted-foreground text-sm mt-0.5">پنل مدیریت صاحب باشگاه</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">

          {/* ─── OTP: enter phone ─── */}
          {mode === MODE_OTP_PHONE && (
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm leading-6 text-foreground font-medium">
                مدیر عزیز باشگاه، لطفا یک شماره منحصر‌به‌فرد برای این داشبورد اختصاص دهید. این شماره باید فقط برای پنل مدیریت باشد و امکان استفاده همزمان آن در اپلیکیشن رکت‌زون وجود ندارد.
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Input
                  label="شماره تلفن"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  dir="ltr"
                />
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  <PhoneIcon className="w-4 h-4" />
                  {loading ? "در حال ارسال..." : "ارسال کد تأیید"}
                </Button>
              </form>
              <button
                type="button"
                onClick={() => { setNoPasswordSet(false); setMode(MODE_PASSWORD); }}
                className="w-full text-xs text-primary text-center mt-1"
              >
                ورود با رمز عبور
              </button>
            </>
          )}

          {/* ─── OTP: enter code ─── */}
          {mode === MODE_OTP_CODE && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                کد ارسال شده به <span className="font-mono font-bold text-foreground" dir="ltr">{phone}</span>
              </p>
              <Input
                label="کد تأیید"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="کد ۴ رقمی"
                maxLength={6}
                dir="ltr"
                className="text-center tracking-widest text-lg"
              />
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                <KeyIcon className="w-4 h-4" />
                {loading ? "در حال بررسی..." : "ورود به پنل"}
              </Button>
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  {resendSeconds > 0 ? `زمان ارسال مجدد کد: ${formatCountdown(resendSeconds)}` : "کد را دریافت نکردید؟"}
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendSeconds > 0}
                  className="w-full text-xs text-primary disabled:text-muted-foreground disabled:cursor-not-allowed text-center"
                >
                  ارسال مجدد کد
                </button>
                <button type="button" onClick={() => setMode(MODE_OTP_PHONE)} className="w-full text-xs text-muted-foreground text-center">
                  تغییر شماره
                </button>
              </div>
            </form>
          )}

          {/* ─── Password login ─── */}
          {mode === MODE_PASSWORD && (
            <>
              {noPasswordSet && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-3 text-sm text-amber-800 dark:text-amber-300 space-y-2">
                  <p className="font-medium">رمز عبور برای این شماره تنظیم نشده است.</p>
                  <p className="text-xs">ابتدا با کد یکبار مصرف وارد شوید، سپس از بخش «تنظیم رمز عبور» در منو رمز خود را ثبت کنید.</p>
                  <button
                    type="button"
                    onClick={() => { setNoPasswordSet(false); setMode(MODE_OTP_PHONE); }}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline"
                  >
                    ورود با کد یکبار مصرف ←
                  </button>
                </div>
              )}
              <form onSubmit={handleLoginWithPassword} className="space-y-4">
                <Input
                  label="شماره تلفن"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  dir="ltr"
                />
                <div className="relative">
                  <Input
                    label="رمز عبور"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="رمز عبور"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-[38px] -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  <LockIcon className="w-4 h-4" />
                  {loading ? "در حال ورود..." : "ورود با رمز عبور"}
                </Button>
              </form>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => { setMode(MODE_FORGOT_PHONE); setOtp(""); }}
                  className="w-full text-xs text-primary text-center"
                >
                  فراموشی رمز عبور
                </button>
                <button
                  type="button"
                  onClick={() => setMode(MODE_OTP_PHONE)}
                  className="w-full text-xs text-muted-foreground text-center"
                >
                  ورود با کد یکبار مصرف
                </button>
              </div>
            </>
          )}

          {/* ─── Forgot: enter phone ─── */}
          {mode === MODE_FORGOT_PHONE && (
            <form onSubmit={handleForgotSendOtp} className="space-y-4">
              <p className="text-sm font-medium text-foreground text-center">بازیابی رمز عبور</p>
              <p className="text-xs text-muted-foreground text-center">شماره موبایل ثبت‌شده در پنل را وارد کنید</p>
              <Input
                label="شماره تلفن"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="09XXXXXXXXX"
                dir="ltr"
              />
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                <PhoneIcon className="w-4 h-4" />
                {loading ? "در حال ارسال..." : "ارسال کد تأیید"}
              </Button>
              <button type="button" onClick={() => setMode(MODE_PASSWORD)} className="w-full text-xs text-muted-foreground text-center">
                بازگشت
              </button>
            </form>
          )}

          {/* ─── Forgot: enter OTP ─── */}
          {mode === MODE_FORGOT_OTP && (
            <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                کد ارسال شده به <span className="font-mono font-bold text-foreground" dir="ltr">{phone}</span>
              </p>
              <Input
                label="کد تأیید"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="کد ۴ رقمی"
                maxLength={6}
                dir="ltr"
                className="text-center tracking-widest text-lg"
              />
              <Button type="submit" disabled={loading || !otp} className="w-full" size="lg">
                تأیید کد
              </Button>
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  {resendSeconds > 0 ? `زمان ارسال مجدد کد: ${formatCountdown(resendSeconds)}` : "کد را دریافت نکردید؟"}
                </p>
                <button
                  type="button"
                  onClick={handleForgotSendOtp}
                  disabled={loading || resendSeconds > 0}
                  className="w-full text-xs text-primary disabled:text-muted-foreground disabled:cursor-not-allowed text-center"
                >
                  ارسال مجدد کد
                </button>
                <button type="button" onClick={() => setMode(MODE_FORGOT_PHONE)} className="w-full text-xs text-muted-foreground text-center">
                  تغییر شماره
                </button>
              </div>
            </form>
          )}

          {/* ─── Forgot: set new password ─── */}
          {mode === MODE_FORGOT_NEW && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm font-medium text-foreground text-center">رمز عبور جدید</p>
              <div className="relative">
                <Input
                  label="رمز عبور جدید (حداقل ۸ کاراکتر)"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="رمز عبور جدید"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-3 top-[38px] -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                <LockIcon className="w-4 h-4" />
                {loading ? "در حال ذخیره..." : "تغییر رمز عبور"}
              </Button>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
}
