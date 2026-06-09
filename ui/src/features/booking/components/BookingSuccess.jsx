import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPersianDateInTehran } from "@/lib/timezone";
import BookingStatusBadge from "./BookingStatusBadge";

function formatDateFa(dateStr) {
  return formatPersianDateInTehran(dateStr, { weekday: "long", month: "long", day: "numeric" });
}

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

export default function BookingSuccess({ booking, onViewBookings, onNewBooking }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center px-6 py-10 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-5"
      >
        <CheckCircle2Icon className="w-10 h-10 text-emerald-500" />
      </motion.div>

      <h2 className="text-xl font-black text-foreground mb-1">درخواست ثبت شد!</h2>
      <p className="text-muted-foreground text-sm mb-5">
        درخواست رزرو شما با موفقیت ارسال شد و در انتظار تأیید مدیر است.
      </p>

      <div className="w-full rounded-2xl border border-border bg-card p-4 space-y-2 text-sm mb-6">
        <div className="flex justify-between">
          <span className="text-muted-foreground">زمین</span>
          <span className="font-semibold text-foreground">{booking.court?.name ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">تاریخ</span>
          <span className="font-semibold text-foreground">{formatDateFa(booking.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">ساعت</span>
          <span className="font-semibold text-foreground">{booking.startTime}–{booking.endTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">مبلغ</span>
          <span className="font-bold text-primary">{formatPrice(booking.totalPrice)} تومان</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">وضعیت</span>
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <Button onClick={onViewBookings} className="w-full rounded-xl">
          مشاهده رزروهای من
        </Button>
        <Button variant="outline" onClick={onNewBooking} className="w-full rounded-xl">
          رزرو جدید
        </Button>
      </div>
    </motion.div>
  );
}
