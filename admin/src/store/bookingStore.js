import { atom } from "jotai";

const LAST_SEEN_BOOKING_AT_KEY = "raqetzone-admin-bookings-last-seen-at";

function getSafeStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function normalizeIsoDate(value) {
  if (!value) return "";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "";
  return new Date(time).toISOString();
}

export function getLastSeenBookingAt() {
  const storage = getSafeStorage();
  if (!storage) return "";
  return normalizeIsoDate(storage.getItem(LAST_SEEN_BOOKING_AT_KEY));
}

export function setLastSeenBookingAt(value) {
  const storage = getSafeStorage();
  if (!storage) return;
  const normalized = normalizeIsoDate(value);
  if (!normalized) return;
  storage.setItem(LAST_SEEN_BOOKING_AT_KEY, normalized);
}

export function clearLastSeenBookingAt() {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.removeItem(LAST_SEEN_BOOKING_AT_KEY);
}

export const unseenBookingsCountAtom = atom(0);
