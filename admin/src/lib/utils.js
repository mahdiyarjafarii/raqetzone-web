import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...i) => twMerge(clsx(i));

export const fmt = (n) => new Intl.NumberFormat("fa-IR").format(n ?? 0);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fa-IR", { year:"numeric", month:"short", day:"numeric" }) : "—";
export const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fa-IR", { hour:"2-digit", minute:"2-digit" }) : "—";
