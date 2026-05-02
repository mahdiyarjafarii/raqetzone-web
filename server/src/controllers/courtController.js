import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { courts, bookings } from "../db/schema.js";

// Build all slot strings for a court on a given date
function generateSlots(openTime, closeTime, slotDuration, bookedSlots) {
  const slots = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let t = openMinutes; t + slotDuration <= closeMinutes; t += slotDuration) {
    const sh = String(Math.floor(t / 60)).padStart(2, "0");
    const sm = String(t % 60).padStart(2, "0");
    const eh = String(Math.floor((t + slotDuration) / 60)).padStart(2, "0");
    const em = String((t + slotDuration) % 60).padStart(2, "0");
    const start = `${sh}:${sm}`;
    const end = `${eh}:${em}`;

    const isBooked = bookedSlots.some(
      (b) => b.startTime === start && b.status !== "rejected" && b.status !== "cancelled"
    );

    slots.push({ start, end, isBooked });
  }
  return slots;
}

export const getCourtsController = async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(courts)
      .where(eq(courts.isActive, true));
    return res.status(200).json({ courts: rows });
  } catch (error) {
    console.error("getCourts error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getCourtByIdController = async (req, res) => {
  try {
    const [court] = await db
      .select()
      .from(courts)
      .where(and(eq(courts.id, req.params.id), eq(courts.isActive, true)))
      .limit(1);

    if (!court) return res.status(404).json({ message: "زمین یافت نشد" });
    return res.status(200).json({ court });
  } catch (error) {
    console.error("getCourtById error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getCourtAvailabilityController = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "تاریخ نامعتبر است" });
    }

    const [court] = await db
      .select()
      .from(courts)
      .where(and(eq(courts.id, id), eq(courts.isActive, true)))
      .limit(1);

    if (!court) return res.status(404).json({ message: "زمین یافت نشد" });

    const bookedSlots = await db
      .select({ startTime: bookings.startTime, status: bookings.status })
      .from(bookings)
      .where(and(eq(bookings.courtId, id), eq(bookings.date, date)));

    const slots = generateSlots(
      court.openTime,
      court.closeTime,
      court.slotDuration,
      bookedSlots
    );

    return res.status(200).json({ date, slots, court });
  } catch (error) {
    console.error("getCourtAvailability error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
