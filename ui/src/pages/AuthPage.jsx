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
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          {currentForm === "enter-phone" ? (
            <>
              <form onSubmit={handleSubmitPhone}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <a
                      href="#"
                      className="flex flex-col items-center gap-2 font-medium"
                    >
                      <div className="flex size-8 items-center justify-center rounded-md">
                        <img
                          src="/logo.png"
                          alt="Raqet zone AI"
                          className="size-8"
                        />
                      </div>
                      <span className="sr-only">مایکت هوش </span>
                    </a>

                    <h1 className="text-xl font-bold">
                      خوش آمدید به به رکت زون{" "}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      لطفا برای ادامه به حساب کاربری خود وارد شوید
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
                      />
                    </InputGroup>
                  </Field>

                  <Field>
                    <Button type="submit" disabled={isSubmitting || !phone}>
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

              <FieldDescription className="px-6 text-center">
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
                    <div className="flex size-8 items-center justify-center rounded-md">
                      <img src="/logo.png" alt="Raqet zone AI" className="size-8" />
                    </div>
                    <span className="sr-only">رکت زون </span>
                  </a>

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
                        character: "rounded-md border !border-gray-400 shadow !w-12 !h-14 text-xl",
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
                  >
                    <PencilLineIcon className="size-4" />
                    تغییر شماره تلفن
                  </Button>
                </Field>

                <FieldDescription className="text-center">
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
