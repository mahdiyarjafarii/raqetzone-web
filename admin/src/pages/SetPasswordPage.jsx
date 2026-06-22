import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword]           = useState("");
  const [confirm, setConfirm]             = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [loading, setLoading]             = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return toast.error("رمز عبور را وارد کنید");
    if (password.length < 8) return toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    if (password !== confirm) return toast.error("تکرار رمز عبور مطابقت ندارد");

    setLoading(true);
    const { ok, data } = await apiClient.post("/auth/set-password", { password });
    setLoading(false);

    if (!ok) return toast.error(data?.message ?? "خطا در ذخیره رمز عبور");
    toast.success("رمز عبور با موفقیت تنظیم شد");
    setPassword("");
    setConfirm("");
    navigate("/");
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4" dir="rtl">
      <h1 className="text-xl font-bold text-foreground mb-1">تنظیم رمز عبور</h1>
      <p className="text-sm text-muted-foreground mb-3">
        با تنظیم رمز عبور می‌توانید علاوه بر کد یکبار مصرف، از طریق رمز عبور نیز وارد پنل شوید.
      </p>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="relative">
            <Input
              label="رمز عبور جدید (حداقل ۸ کاراکتر)"
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

          <div className="relative">
            <Input
              label="تکرار رمز عبور"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="تکرار رمز عبور"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-[38px] -translate-y-1/2 text-muted-foreground"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            <LockIcon className="w-4 h-4" />
            {loading ? "در حال ذخیره..." : "ذخیره رمز عبور"}
          </Button>
        </form>
      </div>
    </div>
  );
}
