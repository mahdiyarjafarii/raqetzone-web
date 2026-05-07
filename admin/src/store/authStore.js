import { atom } from "jotai";

const stored = (() => {
  try { return JSON.parse(localStorage.getItem("raqetzone-admin-user") ?? "null"); } catch { return null; }
})();

export const adminUserAtom  = atom(stored);
export const adminTokenAtom = atom(localStorage.getItem("raqetzone-admin-token") ?? null);

// Helper derived values
export const isAdminAtom     = atom((get) => !!get(adminUserAtom)?.isAdmin);
export const isClubOwnerAtom = atom((get) => {
  const u = get(adminUserAtom);
  return !!(u?.isClubOwner || u?.isAdmin);
});
