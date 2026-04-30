import { db } from "../db/index.js";
import { pricingAnalytics } from "../db/schema.js";

/**
 * Track pricing modal analytics event
 * POST /analytics/pricing
 */
export const trackPricingEventController = async (req, res) => {
  try {
    const userId = req.user?.id || null; // Can be null for anonymous users
    const {
      eventType,
      modalType,
      triggerSource,
      selectedPlan,
      selectedPeriod,
      sessionId,
      metadata,
    } = req.body;

    // Validate required fields
    if (!eventType || !modalType) {
      return res.status(400).json({
        message: "eventType and modalType are required",
      });
    }

    // Validate eventType
    const validEventTypes = ["modal_view", "checkout_click"];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        message: `Invalid eventType. Must be one of: ${validEventTypes.join(", ")}`,
      });
    }

    // Validate modalType
    const validModalTypes = ["pricing_sheet", "reach_limit_pricing_sheet"];
    if (!validModalTypes.includes(modalType)) {
      return res.status(400).json({
        message: `Invalid modalType. Must be one of: ${validModalTypes.join(", ")}`,
      });
    }

    // Extract device info from user agent
    const userAgent = req.headers["user-agent"] || "";
    const deviceType = getDeviceType(userAgent);
    const platform = getPlatform(req);

    await db.insert(pricingAnalytics).values({
      userId,
      eventType,
      modalType,
      triggerSource: triggerSource || null,
      selectedPlan: selectedPlan || null,
      selectedPeriod: selectedPeriod || null,
      userAgent,
      deviceType,
      platform,
      sessionId: sessionId || null,
      metadata: metadata || {},
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Track pricing event error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Determine device type from user agent
 */
function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();

  if (
    /mobile|android|iphone|ipod|blackberry|windows phone|opera mini|iemobile/i.test(
      ua
    )
  ) {
    if (/tablet|ipad/i.test(ua)) {
      return "tablet";
    }
    return "mobile";
  }

  if (/tablet|ipad/i.test(ua)) {
    return "tablet";
  }

  return "desktop";
}

/**
 * Determine platform from request
 */
function getPlatform(req) {
  const userAgent = req.headers["user-agent"] || "";

  // Check for Myket app
  if (
    userAgent.toLowerCase().includes("myket") ||
    req.headers["x-myket-app"] === "true"
  ) {
    return "myket_app";
  }

  // Check for PWA (Progressive Web App)
  if (req.headers["x-pwa"] === "true") {
    return "pwa";
  }

  return "web";
}
