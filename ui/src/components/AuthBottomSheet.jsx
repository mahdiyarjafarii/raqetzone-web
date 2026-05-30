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

  const OTP_LENGTH = 4;

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

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
    }
  }, [open]);

  const startResendTimer = () => {
    setResendTimer(60);
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
      defaultSnap={({ maxHeight }) => maxHeight * 0.58}
      snapPoints={({ maxHeight }) => [maxHeight * 0.58, maxHeight * 0.78]}
      blocking={true}
      scrollLocking={true}
      className="auth-bottom-sheet bottom-sheet"
    >
      <div className="relative overflow-hidden bg-[#fbfaf8] px-5 pb-6 pt-4 text-foreground dark:bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_70%_0%,rgba(43,15,217,0.12),transparent_38%)]" />
        <div className="relative rounded-[28px] border border-black/[0.06] bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-card dark:shadow-black/10">
        {currentForm === "enter-phone" ? (
          <form onSubmit={handleSubmitPhone}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-1.5 text-center mb-3">
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
                  className="w-full h-11 rounded-2xl font-black"
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
              <div className="flex flex-col items-center gap-1.5 text-center mb-3">
                <div className="flex size-13 items-center justify-center rounded-[20px] bg-primary/8 border border-primary/10">
                  <img src="/logo.png" alt="Raqet Zone" className="size-10 object-contain" />
                </div>
                <h1 className="text-xl font-black tracking-tight">کد تایید را وارد کنید</h1>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  کد تایید ۴ رقمی به شماره {phone} ارسال شد
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
                        "rounded-2xl border !border-border bg-muted/40 !w-11 !h-13 text-xl font-black",
                      characterInactive: "!bg-muted/40",
                      characterSelected: "!border-primary ring-2 ring-primary/20",
                    }}
                  />
                </div>
                <FieldDescription className="text-center text-xs">
                  کد را از پیامک دریافتی خود وارد کنید
                </FieldDescription>
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={code.length !== OTP_LENGTH || isSubmitting}
                  className="w-full h-11 rounded-2xl font-black"
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
                    ? `ارسال مجدد کد (${resendTimer})`
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
