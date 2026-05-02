import { atom } from "jotai";

const stored = (() => {
  try { return JSON.parse(localStorage.getItem("raqetzone-admin-user") ?? "null"); } catch { return null; }
})();

export const adminUserAtom = atom(stored);
export const adminTokenAtom = atom(localStorage.getItem("raqetzone-admin-token") ?? null);
