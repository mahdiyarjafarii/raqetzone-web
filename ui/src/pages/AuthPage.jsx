import React, { useState, useEffect } from "react";
import { PencilLineIcon, PhoneIcon } from "lucide-react";
import VerificationInput from "react-verification-input";
import { toast } from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import googleIcon from "@/assets/img/google.png";
import apiClient from "@/lib/apiClient";
import useAuth from "@/auth/useAuth";

const OTP_LENGTH = 4;

export default function AuthPage({ className, ...props }) {
  const [currentForm, setCurrentForm] = useState("enter-phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const { logIn } = useAuth();

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

  const startResendTimer = () => {
    setResendTimer(60);
  };

  const handleSubmitPhone = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, ok } = await apiClient.post("/auth/send-otp", { phone });
    setIsSubmitting(false);

    if (!ok) return toast.error(data?.message || "خطا در ارسال کد");

    toast.success("کد تایید ارسال شد");
    setCurrentForm("enter-code");
    startResendTimer();
  };

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, ok } = await apiClient.post("/auth/verify-otp", {
      phone,
      code,
    });
    setIsSubmitting(false);

    if (!ok) return toast.error(data?.message || "کد نامعتبر است");

    logIn(data);
    toast.success("ورود موفقیت‌آمیز");
    window.location.href = "/";
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

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsSubmitting(true);

      const { data, ok } = await apiClient.post("/auth/google", {
        token: tokenResponse.access_token,
      });
      setIsSubmitting(false);

      if (!ok) return toast.error(data?.message || "خطا در ورود با Google");

      logIn(data);
      toast.success("ورود موفقیت‌آمیز");
      window.location.href = "/";
    },
    onError: () => {
      toast.error("خطا در ورود با Google");
    },
  });

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#fbfaf8] p-5 text-foreground dark:bg-background md:p-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_70%_0%,rgba(43,15,217,0.16),transparent_38%),radial-gradient(circle_at_20%_12%,rgba(239,24,113,0.10),transparent_32%)]" />
      <div className="relative w-full max-w-sm">
        <div className={cn("rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-card/90 dark:shadow-black/20", className)} {...props}>
          {currentForm === "enter-phone" ? (
            <>
              <form onSubmit={handleSubmitPhone}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <a
                      href="#"
                      className="flex flex-col items-center gap-2 font-medium"
                    >
                      <div className="flex size-16 items-center justify-center rounded-[24px] bg-primary/8 border border-primary/10 shadow-sm">
                        <img
                          src="/logo.png"
                          alt="Raqet Zone"
                          className="size-12 object-contain"
                        />
                      </div>
                      <span className="sr-only">رکت زون</span>
                    </a>

                    <h1 className="text-2xl font-black tracking-tight">
                      ورود به رکت‌زون
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      شماره موبایل‌ت رو وارد کن تا کد ورود برات ارسال بشه.
                    </p>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="phone" className="font-bold">شماره موبایل</FieldLabel>
                    <InputGroup className="rounded-2xl border-border/70 bg-muted/45 px-1">
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
                        className="h-12 text-base font-bold"
                      />
                    </InputGroup>
                  </Field>

                  <Field>
                    <Button type="submit" disabled={isSubmitting || !phone} className="h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
                      {isSubmitting ? <Spinner /> : "ورود"}
                    </Button>
                  </Field>

                  <FieldSeparator>یا</FieldSeparator>

                  <Field>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isSubmitting}
                      className="h-12 rounded-2xl bg-white/70 font-bold dark:bg-white/5"
                    >
                      {isSubmitting ? (
                        <Spinner />
                      ) : (
                        <>
                          <img
                            src={googleIcon}
                            alt="Google"
                            className="size-4"
                          />
                          ادامه با Google
                        </>
                      )}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>

              <FieldDescription className="px-2 text-center text-xs leading-relaxed">
                با کلیک بر روی ادامه، با <a href="#">شرایط خدمات</a> و{" "}
                <a href="#">سیاست حریم خصوصی</a> ما موافق هستید.
              </FieldDescription>
            </>
          ) : (
            <form onSubmit={handleSubmitCode}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <a
                    href="#"
                    className="flex flex-col items-center gap-2 font-medium"
                  >
                    <div className="flex size-16 items-center justify-center rounded-[24px] bg-primary/8 border border-primary/10 shadow-sm">
                      <img src="/logo.png" alt="Raqet Zone" className="size-12 object-contain" />
                    </div>
                    <span className="sr-only">رکت زون </span>
                  </a>

                  <h1 className="text-2xl font-black tracking-tight">کد تایید را وارد کنید</h1>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
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
                        character: "rounded-2xl border !border-border bg-muted/45 shadow-sm !w-12 !h-14 text-xl font-black",
                        characterInactive: "!bg-muted/45",
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
                    className="h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
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
                    className="h-12 rounded-2xl font-bold"
                  >
                    <PencilLineIcon className="size-4" />
                    تغییر شماره تلفن
                  </Button>
                </Field>

                <FieldDescription className="text-center text-xs">
                  کد را دریافت نکردید؟{" "}
                  <button
                    type="button"
                    className={`text-primary hover:underline ${
                      resendTimer > 0 || isSubmitting
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
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
    </div>
  );
}
