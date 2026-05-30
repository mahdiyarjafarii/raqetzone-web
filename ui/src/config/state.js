import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const defaultAiModel = {
  slug: "gpt-4o-mini",
  provider: "openai",
  name: "GPT-4o-mini",
  price: 1,
};

export const defaultImageModel = {
  slug: "nano-banana",
  provider: "Google",
  name: "Nanobanana",
  price: 25,
};

export const proUserDefaultAiModel = {
  slug: "gemini-2.5-flash-lite",
  provider: "Google",
  name: "Gemini 2.5 Flash Lite",
  price: 4,
};

// Model that supports web search - used when user enables web search with default model
export const webSearchCapableModel = {
  slug: "gemini-2.5-flash",
  provider: "google",
  name: "Gemini 2.5 Flash",
  price: 3,
};

export const currentUserAtom = atomWithStorage("raqet-ai-user", null);
// These atoms are now synced with backend Redis storage via useUserPreference hook
// Using regular atoms instead of atomWithStorage as the source of truth is now the backend
export const showOnboardingAtom = atom(true);
export const usageHintAtom = atom(true);
export const gemHintAtom = atom(true);
export const pageTitleAtom = atom("");
export const searchModeAtom = atom(null);
export const showOverlayLoadingAtom = atom(false);
export const isThinkingModeAtom = atom(false);
export const isDeepResearchModeAtom = atom(false);
export const themeAtom = atomWithStorage("raqetzone-ai-theme", "light");
export const showSubscriptionInvitationAtom = atomWithStorage("raqetzone-ai-subscription-invitation", false);
export const currentModelAtom = atomWithStorage("raqetzone-ai-model", defaultAiModel);
export const currentImageModelAtom = atomWithStorage("raqetzone-ai-image-model", defaultImageModel);
export const currentVideoModelAtom = atomWithStorage("raqetzone-ai-video-model", {
  slug: "fal-ai/ltxv-2/text-to-video/fast",
  provider: "fal ai",
  name: "Ltxv 2",
});
export const showPricingSheetAtom = atom(false);
export const pricingSheetTriggerSourceAtom = atom("unknown"); // Tracks where the pricing sheet was triggered from
export const showReachLimitPricingSheetAtom = atom(false);
export const reachLimitPricingSheetTriggerSourceAtom = atom("reach_limit"); // Tracks where the reach limit sheet was triggered from
export const showHintAlertModalAtom = atom(false);
export const hasTitleReachLimitPricingSheetAtom = atom(true);
export const webSearchEnabledAtom = atom(false);

// Auth bottom sheet state for web login
export const showAuthSheetAtom = atom(false);
export const authCallbacksAtom = atom({ onSuccess: null, onError: null });

// Onboarding — shown once after first login if profile is incomplete
export const showOnboardingSheetAtom = atom(false);

// Direct messaging unread count
export const unreadDmCountAtom = atom(0);
