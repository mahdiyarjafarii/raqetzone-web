import React from "react";

import { Spinner } from "@/components/ui/spinner";

function CheckMyketLogin() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center rounded-md">
              <img src="/logo.png" alt="Raqet Zone" className="size-8" />
            </div>

            <span className="sr-only">Raqet zone</span>
          </div>

          <h1 className="text-xl font-bold">خوش آمدید به به پلفترم رکت زون </h1>
          <p className="text-sm text-muted-foreground">
            در حال بررسی حساب کاربری...
          </p>

          <div className="flex items-center justify-center pt-4">
            <Spinner className="size-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckMyketLogin;
