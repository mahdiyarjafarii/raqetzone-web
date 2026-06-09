import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...i) => twMerge(clsx(i));
const TEHRAN_TIME_ZONE = "Asia/Tehran";

function cleanNamePart(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getUserFullName(user) {
  const firstName = cleanNamePart(user?.firstName ?? user?.first_name);
  const lastName = cleanNamePart(user?.lastName ?? user?.last_name);
  if (!firstName || !lastName) return "";
  return `${firstName} ${lastName}`;
}

export const fmt = (n) => new Intl.NumberFormat("fa-IR").format(n ?? 0);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE, year:"numeric", month:"short", day:"numeric" }) : "—";
export const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fa-IR", { timeZone: TEHRAN_TIME_ZONE, hour:"2-digit", minute:"2-digit" }) : "—";
