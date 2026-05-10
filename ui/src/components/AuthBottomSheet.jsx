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
      defaultSnap={({ maxHeight }) => maxHeight * 0.6}
      snapPoints={({ maxHeight }) => [maxHeight * 0.6, maxHeight * 0.8]}
      blocking={true}
      scrollLocking={true}
      className="auth-bottom-sheet bottom-sheet"
    >
      <div className="flex flex-col gap-4 px-6 pb-8">
        {currentForm === "enter-phone" ? (
          <form onSubmit={handleSubmitPhone}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center mb-4">
                <div className="flex size-12 items-center justify-center rounded-md">
                  <img src="/logo.png" alt="Raqet Zone" className="size-12" />
                </div>
                <h1 className="text-xl font-bold">ورود به رکت زون</h1>
                <p className="text-sm text-muted-foreground">
                  لطفا شماره موبایل خود را وارد کنید
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="phone">شماره تلفن</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <PhoneIcon className="size-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="phone"
                    type="tel"
                    placeholder="09123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoFocus
                  />
                </InputGroup>
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={isSubmitting || !phone}
                  className="w-full"
                >
                  {isSubmitting ? <Spinner /> : "ادامه"}
                </Button>
              </Field>

              <FieldDescription className="text-center text-xs mt-2">
                با ادامه، با <a href="#" className="text-primary">شرایط خدمات</a> و{" "}
                <a href="#" className="text-primary">سیاست حریم خصوصی</a> موافقت می‌کنید.
              </FieldDescription>
            </FieldGroup>
          </form>
        ) : (
          <form onSubmit={handleSubmitCode}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center mb-4">
                <div className="flex size-12 items-center justify-center rounded-md">
                  <img src="/logo.png" alt="Raqet Zone" className="size-12" />
                </div>
                <h1 className="text-xl font-bold">کد تایید را وارد کنید</h1>
                <p className="text-sm text-muted-foreground">
                  کد تایید ۴ رقمی به شماره {phone} ارسال شد
                </p>
              </div>

              <Field>
                <FieldLabel className="text-center">کد تایید</FieldLabel>
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
                        "rounded-md border !border-gray-400 shadow !w-12 !h-14 text-xl",
                      characterInactive: "!bg-gray-200",
                      characterSelected: "border-ring ring-2 ring-ring/50",
                    }}
                  />
                </div>
                <FieldDescription className="text-center">
                  کد را از پیامک دریافتی خود وارد کنید
                </FieldDescription>
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={code.length !== OTP_LENGTH || isSubmitting}
                  className="w-full"
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
                  className="w-full"
                >
                  <PencilLineIcon className="size-4" />
                  تغییر شماره تلفن
                </Button>
              </Field>

              <FieldDescription className="text-center">
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
    </BottomSheet>
  );
};

export default AuthBottomSheet;
