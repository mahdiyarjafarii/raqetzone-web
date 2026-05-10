import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export async function checkUserHasEnoughCredits(
  userId,
  modelId,
  _unused = null,
  isCharacter = false
) {
  try {
    // Validate inputs
    if (!userId || typeof userId !== "string") {
      return { success: false, hasEnough: false, message: "Invalid user ID" };
    }

    if (!modelId || typeof modelId !== "string") {
      return { success: false, hasEnough: false, message: "Invalid model ID" };
    }

    // Get user's current credits from database
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return {
        success: false,
        hasEnough: false,
        message: "User not found in database",
      };
    }

    // Check if subscription has expired
    if (currentUser.subscriptionEndDate) {
      const subscriptionEndDate = new Date(currentUser.subscriptionEndDate);
      const now = new Date();
      
      if (subscriptionEndDate < now) {
        // Subscription has expired - reset credits to 0
        await db
          .update(users)
          .set({
            credits: 0,
            subscriptionEndDate: null,
            subscriptionType: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        return {
          success: false,
          hasEnough: false,
          message: "اشتراک شما منقضی شده است",
          subscriptionExpired: true,
        };
      }
    }

    const currentCredits = currentUser.credits || 0;

    const isCharacterBool = isCharacter === true || isCharacter === "true";
    const requiredCredits = isCharacterBool ? 15 : 1;

    const hasEnough = currentCredits >= requiredCredits;

    return {
      success: true,
      hasEnough,
      userCredits: currentCredits,
      requiredCredits,
      message: hasEnough ? "User has enough credits" : "اعتبار کافی نمی باشد",
    };
  } catch (error) {
    console.error("Error checking user credits:", error);
    return {
      success: false,
      hasEnough: false,
      message: "Internal server error",
    };
  }
} 

export async function deductUserCredits(userId, modelId, requiredCredits) {
  try {
    // First check if user has enough credits
    const creditCheck = await checkUserHasEnoughCredits(userId, modelId);

    if (!creditCheck.hasEnough) {
      return { success: false, message: creditCheck.message };
    }

    if (!creditCheck.hasEnough) {
      return {
        success: false,
        message: "اعتبار کافی نمی باشد",
        remainingCredits: creditCheck.userCredits,
      };
    }

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return { success: false, message: "User not found in database" };
    }

    const currentCredits = currentUser.credits || 0;

    // Double-check credits before deducting (race condition protection)
    if (currentCredits < requiredCredits) {
      return {
        success: false,
        message: "اعتبار کافی نمی باشد",
        remainingCredits: currentCredits,
      };
    }

    // Deduct credits and update database
    const newCredits = currentCredits - requiredCredits;

    const [updatedUser] = await db
      .update(users)
      .set({
        credits: newCredits,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return { success: false, message: "Failed to update user credits" };
    }

    return {
      success: true,
      remainingCredits: newCredits,
    };
  } catch (error) {
    console.error("Error deducting user credits:", error);
    return { success: false, message: "Internal server error" };
  }
}

export async function refundUserCredits(userId, refundAmount) {
  try {
    // Validate inputs
    if (!userId || typeof userId !== "string") {
      return { success: false, message: "Invalid user ID" };
    }

    if (
      !refundAmount ||
      typeof refundAmount !== "number" ||
      refundAmount <= 0
    ) {
      return { success: false, message: "Invalid refund amount" };
    }

    // Get current user
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return { success: false, message: "User not found in database" };
    }

    const currentCredits = currentUser.credits || 0;
    const newCredits = currentCredits + refundAmount;

    // Update user credits
    const [updatedUser] = await db
      .update(users)
      .set({
        credits: newCredits,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return { success: false, message: "Failed to refund user credits" };
    }

    return {
      success: true,
      refundedAmount: refundAmount,
      newBalance: newCredits,
    };
  } catch (error) {
    console.error("Error refunding user credits:", error);
    return { success: false, message: "Internal server error" };
  }
}
