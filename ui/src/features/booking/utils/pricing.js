// Effective total price of a bulk-cart item. The availability endpoint returns
// `slot.price` as a PER-HOUR rate (already reflecting any deal/slot override), so
// multiply by the slot duration. Falls back to the court's hourly rate.
export function bulkItemPrice(item) {
  const perHour = typeof item.slot.price === "number" ? item.slot.price : item.court.pricePerHour;
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const startMin = toMin(item.slot.start);
  const rawEndMin = toMin(item.slot.end);
  const endMin = rawEndMin <= startMin ? rawEndMin + 1440 : rawEndMin;
  const durationHours = (endMin - startMin) / 60;
  return Math.round(perHour * durationHours);
}
