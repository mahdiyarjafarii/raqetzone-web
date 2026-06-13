import React from "react";

import { Spinner } from "@/components/ui/spinner";

function CheckMyketLogin() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#fbfaf8] p-6 text-foreground md:p-10 dark:bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_78%_6%,rgba(43,15,217,0.14),transparent_42%),radial-gradient(circle_at_18%_8%,rgba(14,165,233,0.12),transparent_36%)]" />
      <div className="relative w-full max-w-sm">
        <div className="rounded-[34px] border border-black/[0.06] bg-white/95 px-6 py-8 text-center shadow-2xl shadow-slate-200/65 backdrop-blur-sm dark:border-white/10 dark:bg-card/95 dark:shadow-black/20">
          <div className="mb-2 flex items-center justify-center">
            <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-extrabold text-primary">
              در حال ورود امن
            </span>
          </div>

          <div className="mb-5 flex flex-col items-center gap-3">
            <div className="flex size-16 items-center justify-center rounded-[22px] border border-primary/15 bg-primary/8 shadow-sm">
              <img src="/logo.png" alt="Raqet Zone" className="size-10 object-contain" />
            </div>
            <span className="sr-only">Raqet zone</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight">خوش آمدید به پلتفرم رکت‌زون</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
            در حال بررسی حساب کاربری شما...
          </p>

          <div className="mt-7 flex flex-col items-center gap-3">
            <div className="relative flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.04]">
              <span className="absolute inset-0 animate-ping rounded-full border border-primary/20" />
              <Spinner className="relative z-10 size-7 text-primary" />
            </div>
            <div className="flex items-center gap-1.5" dir="ltr">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary/80 [animation-delay:120ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckMyketLogin;
