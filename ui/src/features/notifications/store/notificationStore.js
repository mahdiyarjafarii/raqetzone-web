import { atom } from "jotai";

export const notificationsAtom = atom([]);
export const unreadCountAtom   = atom(0);
export const notifLoadingAtom  = atom(false);

// Is the dropdown panel open
export const notifPanelOpenAtom = atom(false);
