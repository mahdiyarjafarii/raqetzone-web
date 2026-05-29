import React, { useState } from "react";
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
  const setUser  = useSetAtom(adminUserAtom);
  const setToken = useSetAtom(adminTokenAtom);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) return toast.error("شماره تلفن را وارد کنید");
    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/send-otp", { phone });
    setLoading(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ارسال کد");
    toast.success("کد تأیید ارسال شد");
    setStep("otp");
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
              <button type="button" onClick={() => setStep("phone")} className="w-full text-xs text-muted-foreground text-center">
                تغییر شماره
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
