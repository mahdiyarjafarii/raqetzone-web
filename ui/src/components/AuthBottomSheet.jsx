import React, { useState, useEffect } from "react";
import { BottomSheet } from "react-spring-bottom-sheet";
import { useAtom } from "jotai";
import { PencilLineIcon, PhoneIcon } from "lucide-react";
import VerificationInput from "react-verification-input";
import { toast } from "react-hot-toast";

import { showAuthSheetAtom, authCallbacksAtom } from "@/config/state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/apiClient";
import useAuth from "@/auth/useAuth";

import "react-spring-bottom-sheet/dist/style.css";

const WEB_AUTH_KEY = "raqet-ai-web-auth";

// Helper functions for web auth storage
export const getWebAuthData = () => {
  try {
    const data = localStorage.getItem(WEB_AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error reading web auth data:", error);
    return null;
  }
};

export const setWebAuthData = (data) => {
  try {
    localStorage.setItem(WEB_AUTH_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving web auth data:", error);
  }
};

export const clearWebAuthData = () => {
  try {
    localStorage.removeItem(WEB_AUTH_KEY);
  } catch (error) {
    console.error("Error clearing web auth data:", error);
  }
};

export const isWebAuthenticated = () => {
  const authData = getWebAuthData();
  return authData && authData.phone && authData.verified;
};

const AuthBottomSheet = () => {
  const [open, setOpen] = useAtom(showAuthSheetAtom);
  const [callbacks] = useAtom(authCallbacksAtom);
  const { logIn } = useAuth();

  const [currentForm, setCurrentForm] = useState("enter-phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpExpireTimer, setOtpExpireTimer] = useState(0);

  const OTP_LENGTH = 4;
  const OTP_EXPIRE_SECONDS = 5 * 60;
  const RESEND_SECONDS = 5 * 60;

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (otpExpireTimer > 0 && currentForm === "enter-code") {
      const timer = setTimeout(() => setOtpExpireTimer(otpExpireTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpExpireTimer, currentForm]);

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (code.length === OTP_LENGTH && !isSubmitting && currentForm === "enter-code") {
      handleSubmitCode();
    }
  }, [code]);

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      setCurrentForm("enter-phone");
      setPhone("");
      setCode("");
      setResendTimer(0);
      setOtpExpireTimer(0);
    }
  }, [open]);

  const startResendTimer = () => {
    setResendTimer(RESEND_SECONDS);
  };

  const startOtpExpireTimer = () => {
    setOtpExpireTimer(OTP_EXPIRE_SECONDS);
  };

  const formatRemainingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const maskPhone = (value) => {
    if (!value || value.length < 7) return value;
    return `${value.slice(0, 4)}***${value.slice(-3)}`;
  };

  const handleSubmitPhone = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);

    const { data, ok } = await apiClient.post("/auth/send-otp", { phone });
    setIsSubmitting(false);

    if (!ok) return toast.error(data?.message || "خطا در ارسال کد");

    toast.success("کد تایید ارسال شد");
    setCurrentForm("enter-code");
    startResendTimer();
    startOtpExpireTimer();
  };

  const handleSubmitCode = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);

    const { data, ok } = await apiClient.post("/auth/verify-otp", {
      phone,
      code,
    });
    setIsSubmitting(false);

    if (!ok) return toast.error(data?.message || "کد نامعتبر است");

    logIn(data);

    toast.success("ورود موفقیت‌آمیز");
    setOpen(false);

    // Call success callback
    if (callbacks.onSuccess) {
      callbacks.onSuccess();
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setIsSubmitting(true);

    const { data, ok } = await apiClient.post("/auth/send-otp", { phone });
    setIsSubmitting(false);
    if (!ok) return toast.error(data?.message || "خطا در ارسال کد");

    setCode("");
    toast.success("کد تایید مجدداً ارسال شد");
    startResendTimer();
    startOtpExpireTimer();
  };

  const handleDismiss = () => {
    setOpen(false);
    // Call error callback when user dismisses without completing login
    if (callbacks.onError) {
      callbacks.onError();
    }
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={handleDismiss}
      defaultSnap={({ maxHeight }) => maxHeight * 0.68}
      snapPoints={({ maxHeight }) => [maxHeight * 0.68, maxHeight * 0.9]}
      blocking={true}
      scrollLocking={true}
      className="auth-bottom-sheet bottom-sheet"
    >
      <div className="relative overflow-hidden bg-[#fbfaf8] px-5 pb-7 pt-5 text-foreground dark:bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_80%_0%,rgba(43,15,217,0.14),transparent_40%),radial-gradient(circle_at_15%_8%,rgba(14,165,233,0.12),transparent_36%)]" />
        <div className="relative rounded-[32px] border border-black/[0.06] bg-white/95 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-sm dark:border-white/10 dark:bg-card/95 dark:shadow-black/10">
        {currentForm === "enter-phone" ? (
          <form onSubmit={handleSubmitPhone}>
            <FieldGroup>
              <div className="mb-1 flex items-center justify-center">
                <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-extrabold text-primary">
                  ورود سریع به رکت‌زون
                </span>
              </div>
              <div className="mb-3 flex flex-col items-center gap-1.5 text-center">
                <div className="flex size-13 items-center justify-center rounded-[20px] bg-primary/8 border border-primary/10">
                  <img src="/logo.png" alt="Raqet Zone" className="size-10 object-contain" />
                </div>
                <h1 className="text-xl font-black tracking-tight">ورود به رکت‌زون</h1>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  شماره موبایل‌ت رو وارد کن تا کد ورود برات ارسال بشه.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="phone" className="font-bold">شماره موبایل</FieldLabel>
                <InputGroup className="rounded-2xl border-border/70 bg-muted/40 px-1">
                  <InputGroupAddon>
                    <PhoneIcon className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="phone"
                    type="tel"
                    placeholder="09123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoFocus
                    className="h-11 text-base font-bold"
                  />
                </InputGroup>
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={isSubmitting || !phone}
                  className="h-11 w-full rounded-2xl bg-primary font-black shadow-lg shadow-primary/30 transition hover:scale-[1.01]"
                >
                  {isSubmitting ? <Spinner /> : "ورود"}
                </Button>
              </Field>

              <FieldDescription className="text-center text-[11px] mt-1 leading-relaxed">
                با ادامه، با <a href="#" className="text-primary">شرایط خدمات</a> و{" "}
                <a href="#" className="text-primary">سیاست حریم خصوصی</a> موافقت می‌کنید.
              </FieldDescription>
            </FieldGroup>
          </form>
        ) : (
          <form onSubmit={handleSubmitCode}>
            <FieldGroup>
              <div className="mb-1 flex items-center justify-center">
                <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-extrabold text-primary">
                  احراز هویت با پیامک
                </span>
              </div>
              <div className="mb-3 flex flex-col items-center gap-2 text-center">
                <div className="flex size-13 items-center justify-center rounded-[20px] bg-primary/8 border border-primary/10">
                  <img src="/logo.png" alt="Raqet Zone" className="size-10 object-contain" />
                </div>
                <h1 className="text-xl font-black tracking-tight">کد تایید را وارد کنید</h1>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  کد تایید ۴ رقمی به شماره {maskPhone(phone)} ارسال شد
                </p>
              </div>

              <Field>
                <FieldLabel className="text-center font-bold">کد تایید</FieldLabel>
                <div className="flex justify-center" dir="ltr">
                  <VerificationInput
                    length={OTP_LENGTH}
                    value={code}
                    onChange={setCode}
                    placeholder=""
                    validChars="0-9"
                    autoFocus
                    classNames={{
                      container: "gap-3",
                      character:
                        "rounded-2xl border !border-border bg-muted/40 !w-12 !h-14 text-xl font-black shadow-sm",
                      characterInactive: "!bg-muted/40",
                      characterSelected: "!border-primary ring-2 ring-primary/20",
                    }}
                  />
                </div>
                <FieldDescription className="text-center text-xs">
                  {otpExpireTimer > 0
                    ? "کد را از پیامک دریافتی خود وارد کنید"
                    : "برای دریافت کد جدید، ارسال مجدد را بزنید"}
                </FieldDescription>
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={code.length !== OTP_LENGTH || isSubmitting || otpExpireTimer === 0}
                  className="h-11 w-full rounded-2xl bg-primary font-black shadow-lg shadow-primary/30 transition hover:scale-[1.01]"
                >
                  {isSubmitting ? <Spinner /> : "تایید کد"}
                </Button>
              </Field>

              <Field>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setCurrentForm("enter-phone");
                    setCode("");
                    setResendTimer(0);
                  }}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-2xl font-bold"
                >
                  <PencilLineIcon className="size-4" />
                  تغییر شماره تلفن
                </Button>
              </Field>

              <FieldDescription className="text-center text-xs">
                کد را دریافت نکردید؟{" "}
                <button
                  type="button"
                  className={cn(
                    "text-primary hover:underline",
                    resendTimer > 0 || isSubmitting
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  )}
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || isSubmitting}
                >
                  {resendTimer > 0
                    ? `ارسال مجدد کد تا ${formatRemainingTime(resendTimer)}`
                    : "ارسال مجدد کد"}
                </button>
              </FieldDescription>
            </FieldGroup>
          </form>
        )}
        </div>
      </div>
    </BottomSheet>
  );
};

export default AuthBottomSheet;
