import { atom } from "jotai";

export const matchesAtom = atom([]);
export const matchesLoadingAtom = atom(false);
export const matchesErrorAtom = atom(null);

export const selectedMatchAtom = atom(null);
export const matchDetailLoadingAtom = atom(false);

export const joinLoadingAtom = atom(false);

// Which match + team the confirm modal is for: { matchId, team } | null
export const joinConfirmAtom = atom(null);

// Create match sheet open state
export const createMatchOpenAtom = atom(false);
