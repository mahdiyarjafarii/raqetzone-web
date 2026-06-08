import "react-spring-bottom-sheet/dist/style.css";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon, CalendarCheckIcon, ListIcon } from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import toast from "react-hot-toast";

import {
  bookingStepAtom,
  selectedCourtAtom,
  selectedDateAtom,
  selectedSlotAtom,
  availabilityAtom,
  availabilityLoadingAtom,
  courtsAtom,
  courtsLoadingAtom,
  createdBookingAtom,
  bookingSubmittingAtom,
} from "@/features/booking/store/bookingStore";
import { bookingService } from "@/features/booking/services/bookingService";
import CourtCard from "@/features/booking/components/CourtCard";
import DateStrip from "@/features/booking/components/DateStrip";
import TimeSlotGrid from "@/features/booking/components/TimeSlotGrid";
import BookingSummary from "@/features/booking/components/BookingSummary";
import BookingSuccess from "@/features/booking/components/BookingSuccess";
import BookingList from "@/features/booking/components/BookingList";
import { cn } from "@/lib/utils";

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEP_TITLE = {
  courts: "رزرو زمین",
  slots: null, // dynamic
  summary: "فاکتور رزرو",
  success: "رزرو ثبت شد",
  mybookings: "رزروهای من",
};

export default function BookingPage() {
  const [step, setStep] = useAtom(bookingStepAtom);
  const [courts, setCourts] = useAtom(courtsAtom);
  const [courtsLoading, setCourtsLoading] = useAtom(courtsLoadingAtom);
  const [selectedCourt, setSelectedCourt] = useAtom(selectedCourtAtom);
  const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom);
  const [selectedSlot, setSelectedSlot] = useAtom(selectedSlotAtom);
  const [availability, setAvailability] = useAtom(availabilityAtom);
  const [availLoading, setAvailLoading] = useAtom(availabilityLoadingAtom);
  const [createdBooking, setCreatedBooking] = useAtom(createdBookingAtom);
  const [submitting, setSubmitting] = useAtom(bookingSubmittingAtom);

  // Load courts on mount
  useEffect(() => {
    if (courts.length === 0) fetchCourts();
  }, []);

  // Reload availability when date changes while on slots step
  useEffect(() => {
    if (step === "slots" && selectedCourt && selectedDate) {
      fetchAvailability(selectedCourt.id, selectedDate);
    }
  }, [selectedDate, step]);

  const fetchCourts = async () => {
    setCourtsLoading(true);
    try {
      const res = await bookingService.getCourts();
      if (res.ok) setCourts(res.data.courts);
      else toast.error("خطا در بارگذاری زمین‌ها");
    } finally {
      setCourtsLoading(false);
    }
  };

  const fetchAvailability = async (courtId, date) => {
    setAvailLoading(true);
    setSelectedSlot(null);
    try {
      const res = await bookingService.getAvailability(courtId, date);
      if (res.ok) setAvailability(res.data);
      else toast.error("خطا در دریافت زمان‌های موجود");
    } finally {
      setAvailLoading(false);
    }
  };

  const handleSelectCourt = async (court) => {
    setSelectedCourt(court);
    setSelectedSlot(null);
    setAvailability(null);
    await fetchAvailability(court.id, selectedDate);
    setStep("slots");
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep("summary");
  };

  const handleConfirmBooking = async (notes, paymentMethod = "none") => {
    if (!selectedCourt || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await bookingService.createBooking({
        courtId: selectedCourt.id,
        date: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        notes,
        paymentMethod,
      });
      if (res.ok) {
        setCreatedBooking({ ...res.data.booking, court: selectedCourt });
        setStep("success");
      } else {
        toast.error(res.data?.message ?? "خطا در ثبت رزرو");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === "slots") setStep("courts");
    else if (step === "summary") setStep("slots");
    else if (step === "mybookings") setStep("courts");
  };

  const resetFlow = () => {
    setStep("courts");
    setSelectedCourt(null);
    setSelectedSlot(null);
    setAvailability(null);
    setCreatedBooking(null);
  };

  const showBack = ["slots", "summary", "mybookings"].includes(step);
  const title =
    step === "slots" && selectedCourt
      ? selectedCourt.name
      : STEP_TITLE[step] ?? "رزرو";

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        {showBack ? (
          <button
            onClick={handleBack}
            className="p-1.5 rounded-full bg-muted hover:bg-accent transition-colors"
          >
            <ArrowRightIcon className="w-4 h-4 text-foreground" />
          </button>
        ) : (
          <div className="w-8" />
        )}

        <h1 className="flex-1 font-bold text-foreground text-center">{title}</h1>

        {/* My bookings toggle */}
        {step !== "success" && (
          <button
            onClick={() => setStep(step === "mybookings" ? "courts" : "mybookings")}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              step === "mybookings"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-accent text-foreground"
            )}
          >
            {step === "mybookings" ? (
              <CalendarCheckIcon className="w-4 h-4" />
            ) : (
              <ListIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {/* ── COURTS ── */}
        {step === "courts" && (
          <motion.div
            key="courts"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 pt-4 space-y-3"
          >
            {courtsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
              ))
            ) : courts.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">🏟️</span>
                <p className="text-muted-foreground text-sm">هیچ زمینی موجود نیست</p>
              </div>
            ) : (
              courts.map((court, i) => (
                <CourtCard
                  key={court.id}
                  court={court}
                  index={i}
                  onClick={() => handleSelectCourt(court)}
                />
              ))
            )}
          </motion.div>
        )}

        {/* ── SLOTS ── */}
        {step === "slots" && selectedCourt && (
          <motion.div
            key="slots"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Court mini info */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-lg">
                {selectedCourt.sportType === "padel" ? "🏓" : selectedCourt.sportType === "tennis" ? "🎾" : "🏅"}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{selectedCourt.location}</p>
                <p className="text-xs font-medium text-foreground">
                  {new Intl.NumberFormat("fa-IR").format(selectedCourt.pricePerHour)} تومان/ساعت
                </p>
              </div>
            </div>

            {/* Date strip */}
            <div className="border-b border-border py-2">
              <DateStrip
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />
            </div>

            {/* Slot grid */}
            <div className="pt-4">
              <p className="px-4 text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                اسلات‌های آزاد را انتخاب کنید
                <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block mr-2" />
                رزرو شده
              </p>
              <TimeSlotGrid
                slots={availability?.slots ?? []}
                selectedSlot={selectedSlot}
                onSelect={handleSelectSlot}
                loading={availLoading}
                selectedDate={selectedDate}
              />
            </div>
          </motion.div>
        )}

        {/* ── SUMMARY ── */}
        {step === "summary" && selectedCourt && selectedDate && selectedSlot && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pt-4"
          >
            <BookingSummary
              court={selectedCourt}
              date={selectedDate}
              slot={selectedSlot}
              onConfirm={handleConfirmBooking}
              onBack={() => setStep("slots")}
              submitting={submitting}
            />
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && createdBooking && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pt-4"
          >
            <BookingSuccess
              booking={createdBooking}
              onViewBookings={() => setStep("mybookings")}
              onNewBooking={resetFlow}
            />
          </motion.div>
        )}

        {/* ── MY BOOKINGS ── */}
        {step === "mybookings" && (
          <motion.div
            key="mybookings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pt-4"
          >
            <BookingList />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
