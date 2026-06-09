export const TEHRAN_TIME_ZONE = "Asia/Tehran";

function getDatePart(parts, type) {
  return parts.find((part) => part.type === type)?.value;
}

export function formatDateKeyInTehran(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = getDatePart(parts, "year");
  const month = getDatePart(parts, "month");
  const day = getDatePart(parts, "day");

  return `${year}-${month}-${day}`;
}

export function parseDateKeyAsUTCNoon(dateStr) {
  const [year, month, day] = (dateStr ?? "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function addDaysToDateKey(dateStr, days) {
  const date = parseDateKeyAsUTCNoon(dateStr);
  if (!date) return dateStr;
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKeyInTehran(date);
}

export function getTodayDateKeyInTehran() {
  return formatDateKeyInTehran(new Date());
}

export function getCurrentMinutesInTehran(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TEHRAN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(getDatePart(parts, "hour") ?? 0);
  const minute = Number(getDatePart(parts, "minute") ?? 0);

  return hour * 60 + minute;
}

export function formatPersianDateInTehran(dateStr, options = {}) {
  const date = parseDateKeyAsUTCNoon(dateStr);
  if (!date) return dateStr ?? "";
  return date.toLocaleDateString("fa-IR-u-ca-persian", {
    timeZone: TEHRAN_TIME_ZONE,
    ...options,
  });
}
