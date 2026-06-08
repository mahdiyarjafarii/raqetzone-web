function parseLocalBookingDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatBookingDateFa(dateStr) {
  const date = parseLocalBookingDate(dateStr);
  if (!date) return dateStr ?? "—";
  return date.toLocaleDateString("fa-IR-u-ca-persian", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatBookingTimeRange(startTime, endTime) {
  if (startTime && endTime) return `${startTime} تا ${endTime}`;
  return startTime || endTime || "—";
}

export function formatBookingDateTimeFa({ date, startTime, endTime }) {
  return `${formatBookingDateFa(date)} ساعت ${formatBookingTimeRange(startTime, endTime)}`;
}
