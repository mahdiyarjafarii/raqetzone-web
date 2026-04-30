import express from "express";
import { trackPricingEventController } from "../controllers/analyticsController.js";
import { verifyToken } from "../utils/jwt.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = express.Router();

/**
 * Optional auth middleware - extracts user if token present, but doesn't require it
 * This allows tracking both authenticated and anonymous users
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = req.headers["x-auth-token"];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      req.user = null;
      return next();
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    req.user = user || null;
    next();
  } catch (error) {
    // On error, continue without user
    req.user = null;
    next();
  }
}

// Analytics routes - auth middleware is optional (allows tracking anonymous users)
router.post(
  "/analytics/pricing",
  optionalAuthMiddleware,
  trackPricingEventController
);

export default router;
