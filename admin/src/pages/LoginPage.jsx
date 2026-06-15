import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { motion } from "framer-motion";
import { PhoneIcon, KeyIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import { adminUserAtom, adminTokenAtom } from "@/store/authStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const [step, setStep]     = useState("phone"); // phone | otp
  const [phone, setPhone]   = useState("");
  const [otp, setOtp]       = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const setUser  = useSetAtom(adminUserAtom);
  const setToken = useSetAtom(adminTokenAtom);
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== "otp" || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendSeconds]);

  const formatCountdown = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) return toast.error("شماره تلفن را وارد کنید");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/send-otp", { phone });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ارسال کد");
    toast.success("کد تأیید ارسال شد");
    setStep("otp");
    setResendSeconds(120);
  };

  const handleResendOtp = async () => {
    if (!phone) return toast.error("شماره تلفن را وارد کنید");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/send-otp", { phone });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ارسال مجدد کد");
    toast.success("کد تأیید مجددا ارسال شد");
    setResendSeconds(120);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error("کد تأیید را وارد کنید");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/verify-otp", { phone, code: otp, isClubOwner: true });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "کد نامعتبر است");

    localStorage.setItem("raqetzone-admin-token", data.token);
    localStorage.setItem("raqetzone-admin-user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    toast.success("خوش آمدید 👋");
    navigate("/");
  };

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

        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm leading-6 text-foreground font-medium">
            مدیر عزیز باشگاه، لطفا یک شماره منحصر‌به‌فرد برای این داشبورد اختصاص دهید. این شماره باید فقط برای پنل مدیریت باشد و امکان استفاده همزمان آن در اپلیکیشن رکت‌زون وجود ندارد.
          </div>

          {step === "phone" ? (
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
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
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
                <button type="button" onClick={() => setStep("phone")} className="w-full text-xs text-muted-foreground text-center">
                  تغییر شماره
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
