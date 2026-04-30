import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { config } from "../config/env.js";

const openai = new OpenAI({
  apiKey: config.openaiImageApiKey,
});

const ContentModerationResult = z.object({
  isValid: z.boolean(),
  reason: z.string(),
});

/**
 * Validate media generation prompt for inappropriate content
 * Uses OpenAI gpt-4o-mini with structured outputs for fast and reliable validation
 * 
 * @param {string} prompt - The user's prompt to validate
 * @returns {Promise<{isValid: boolean, reason?: string}>}
 */
export async function checkMediaPrompt(prompt) {
  try {
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI content moderation system. Analyze prompts intended for image/video generation and determine if they request inappropriate content.

BLOCK if the prompt requests:
- Nudity, sexual content, or sexually suggestive material
- Explicit adult content or pornographic imagery
- Intimate body parts or sexual acts
- Violence, gore, or graphic injury
- Hate speech, discrimination, or harmful stereotypes
- Illegal activities or dangerous behavior
- Child exploitation in any form

ALLOW creative, artistic, educational, or professional content that is appropriate for general audiences.

Be context-aware: medical/educational anatomy or artistic nudity in classical art may be acceptable, but err on the side of caution.`
        },
        {
          role: "user",
          content: `Analyze this prompt: "${prompt}"`
        }
      ],
      response_format: zodResponseFormat(ContentModerationResult, "moderation_result"),
    });

    const result = completion.choices[0].message.parsed;
    
    return {
      isValid: result.isValid,
      reason: result.isValid ? undefined : result.reason
    };
  } catch (error) {
    console.error("Error checking media prompt:", error);
    return {
      isValid: false,
      reason: undefined
    };
  }
}
