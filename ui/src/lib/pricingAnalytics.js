import apiClient from "@/lib/apiClient";

window.sessionId = null;

/**
 * Generate or retrieve session ID for grouping analytics events
 */
function getSessionId() {
  if (window.sessionId) return window.sessionId;

  window.sessionId = crypto.randomUUID();

  return window.sessionId;
}

/**
 * Track pricing modal analytics event
 * @param {Object} params - Event parameters
 * @param {string} params.eventType - Type of event: 'modal_view', 'checkout_click'
 * @param {string} params.modalType - Type of modal: 'pricing_sheet', 'reach_limit_pricing_sheet'
 * @param {string} [params.triggerSource] - Where the modal was triggered from (e.g., 'home_page', 'chat_page')
 * @param {string} [params.selectedPlan] - Selected plan: 'basic', 'premium', 'pro'
 * @param {string} [params.selectedPeriod] - Selected period: 'monthly', 'quarterly', 'halfYearly', 'yearly'
 */
export async function trackPricingEvent({
  eventType,
  modalType,
  triggerSource,
  selectedPlan,
  selectedPeriod,
}) {
  try {
    const sessionId = getSessionId();

    await apiClient.post("/analytics/pricing", {
      eventType,
      modalType,
      triggerSource,
      selectedPlan,
      selectedPeriod,
      sessionId,
    });
  } catch (error) {
    // Silently fail analytics - don't disrupt user experience
    console.warn("Failed to track pricing event:", error);
  }
}

// Event type constants for consistency
export const PRICING_EVENTS = {
  MODAL_VIEW: "modal_view",
  CHECKOUT_CLICK: "checkout_click",
};

// Modal type constants
export const MODAL_TYPES = {
  PRICING_SHEET: "pricing_sheet",
  REACH_LIMIT_PRICING_SHEET: "reach_limit_pricing_sheet",
};
