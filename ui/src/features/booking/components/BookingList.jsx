import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPinIcon, CalendarIcon, ClockIcon, XCircleIcon } from "lucide-react";
import { useAtom } from "jotai";
import toast from "react-hot-toast";

import { myBookingsAtom, myBookingsLoadingAtom } from "../store/bookingStore";
import { bookingService } from "../services/bookingService";
import BookingStatusBadge from "./BookingStatusBadge";
import { cn } from "@/lib/utils";
import { formatPersianDateInTehran } from "@/lib/timezone";

const SPORT_ICONS = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };

function formatDateFa(dateStr) {
  return formatPersianDateInTehran(dateStr, { weekday: "short", month: "short", day: "numeric" });
}

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

export default function BookingList() {
  const [bookings, setBookings] = useAtom(myBookingsAtom);
  const [loading, setLoading] = useAtom(myBookingsLoadingAtom);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      if (res.ok) setBookings(res.data.bookings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleCancel = async (id) => {
    setCancelling(true);
    const res = await bookingService.cancelBooking(id);
    setCancelling(false);
    setConfirmCancelId(null);
    if (res.ok) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
      );
      toast.success("رزرو لغو شد");
    } else {
      toast.error(res.data?.message ?? "خطا در لغو رزرو");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <span className="text-5xl block mb-4">📋</span>
        <p className="text-muted-foreground text-sm">هنوز رزروی ندارید</p>
        <p className="text-muted-foreground/60 text-xs mt-1">یک زمین رزرو کنید!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-6">
      <AnimatePresence>
        {bookings.map((booking, i) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
          >
            {/* Status strip */}
            <div
              className={cn(
                "h-1",
                booking.status === "approved" && "bg-emerald-500",
                booking.status === "pending" && "bg-amber-500",
                booking.status === "rejected" && "bg-destructive",
                booking.status === "cancelled" && "bg-muted-foreground"
              )}
            />

            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{SPORT_ICONS[booking.court?.sportType] ?? "🏅"}</span>
                  <div>
                    <p className="font-bold text-foreground text-sm leading-tight">
                      {booking.court?.name}
                    </p>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                      <MapPinIcon className="w-3 h-3 shrink-0" />
                      <span>{booking.court?.location}</span>
                    </div>
                  </div>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {formatDateFa(booking.date)}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {booking.startTime}–{booking.endTime}
                </span>
                <span className="mr-auto font-semibold text-foreground">
                  {formatPrice(booking.totalPrice)} ت
                </span>
              </div>

              {/* Admin note */}
              {booking.adminNote && (
                <div className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                  یادداشت مدیر: {booking.adminNote}
                </div>
              )}

              {/* Cancel button */}
              {booking.status === "pending" && (
                confirmCancelId === booking.id ? (
                  <div className="mt-3 rounded-xl bg-destructive/8 border border-destructive/30 p-3 space-y-2">
                    <p className="text-xs font-bold text-destructive text-center">آیا از لغو درخواست مطمئنید؟</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmCancelId(null)}
                        disabled={cancelling}
                        className="flex-1 h-8 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        انصراف
                      </button>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancelling}
                        className="flex-1 h-8 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {cancelling ? (
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <XCircleIcon className="w-3.5 h-3.5" />
                        )}
                        {cancelling ? "..." : "بله، لغو کن"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCancelId(booking.id)}
                    className="mt-3 flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <XCircleIcon className="w-3.5 h-3.5" />
                    لغو درخواست
                  </button>
                )
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
