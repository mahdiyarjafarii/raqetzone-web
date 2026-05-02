import { atom } from "jotai";

// ─── Step flow: "courts" | "slots" | "summary" | "mybookings"
export const bookingStepAtom = atom("courts");

// Selected court object
export const selectedCourtAtom = atom(null);

// Selected date string YYYY-MM-DD
export const selectedDateAtom = atom(() => {
  const d = new Date();
  return d.toISOString().split("T")[0];
});

// Selected slot { start, end }
export const selectedSlotAtom = atom(null);

// Availability data { date, slots[], court }
export const availabilityAtom = atom(null);
export const availabilityLoadingAtom = atom(false);

// Courts list
export const courtsAtom = atom([]);
export const courtsLoadingAtom = atom(false);

// My bookings
export const myBookingsAtom = atom([]);
export const myBookingsLoadingAtom = atom(false);

// After booking created
export const createdBookingAtom = atom(null);
export const bookingSubmittingAtom = atom(false);
