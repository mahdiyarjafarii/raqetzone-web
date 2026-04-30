import { getRedisClient, isRedisAvailable } from "../config/redis.js";

/**
 * TTL for cached prompt responses: 40 hours in seconds
 */
const PROMPT_CACHE_TTL = 4 * 60 * 60; // 40 hours in seconds

/**
 * List of prompts that should be cached
 * These are the prompts from the PromptSuggestions component
 * Excluding image-related prompts
 */
const cachedPrompts = [
  // Quick suggestions (excluding image and caption which needs image upload)
  "قیمت طلا امروز چنده؟",
  "اين معادله رو حل كن: x + 5 = 15",

  // Suggested category
  "چندتا بازی برای دورهمی‌ها پیشنهاد بده",
  "در نوشتن کپشن برای اینستاگرام یا یوتیوب کمکم کن.",
  "چطور نه گفتن رو تمرین کنم؟",
  "متنی که برات میفرستم رو بهبودش بده.",
  "یک دستور غذای سریع و راحت پیشنهاد بده.",

  // General category
  "میم ۷ ۶ که محبوب شده چیه؟",
  "این متن رو ترجمه کن.",
  "برای تولد دوستم چی بخرم؟",
  "برای مهاجرت از کجا شروع کنم؟",
  "حوصله‌م سر رفته؛ چی کار کنم؟",

  // Daily life category
  "چطور لکه روغن رو از لباس پاک کنم؟",
  "دعوا با همسرم رو چطور حل کنم؟",
  "برای یک استایل خوب چه رنگ‌هایی رو ست کنم؟",
  "چطور کارهای روزانه رو بهتر مدیریت کنم؟",

  // Sports/Fitness category
  "پروتئین وی لازمه؟",
  "چه‌جوری ورزش کنم که سیکس پک داشته باشم؟",
  "یک برنامه غذایی هفتگی برای کاهش وزن بده.",
  "برنامه ورزشی خانگی بدون وسیله بده.",
  "چه‌جوری جلوی لاغر شدن صورت رو موقع ورزش و رژیم بگیرم؟",

  // Education category
  "به من در یک ارائه درسی کمک کن.",
  "چند تکنیک برای تست زدن تو کنکور بهم یاد بده.",
  "یک انشا درباره این موضوع بنویس.",
  "توی انتخاب رشته تحصیلی کمکم کن.",
  "برای تمرین و یادگیری دانش‌آموز دبستانی یک بازی طراحی کن.",
];

/**
 * Generate a cache key for a prompt (model-specific)
 * @param {string} prompt - The prompt text
 * @param {string} model - The model slug
 * @returns {string} Cache key
 */
export const getPromptCacheKey = (prompt, model) => {
  // Normalize the prompt by trimming whitespace
  const normalizedPrompt = prompt.trim();
  return `prompt_cache:${model}:${normalizedPrompt}`;
};

/**
 * Check if a prompt is in the cached prompts list
 * @param {string} prompt - The prompt to check
 * @returns {boolean} True if prompt should be cached
 */
export const isCachedPrompt = (prompt) => {
  if (!prompt) return false;
  const normalizedPrompt = prompt.trim();
  return cachedPrompts.includes(normalizedPrompt);
};

/**
 * Get cached response for a prompt from Redis
 * @param {string} prompt - The prompt to look up
 * @param {string} model - The model slug
 * @returns {Promise<string|null>} Cached response or null
 */
export const getCachedPromptResponse = async (prompt, model) => {
  try {
    const redis = getRedisClient();

    if (!redis || !(await isRedisAvailable())) {
      return null;
    }

    const cacheKey = getPromptCacheKey(prompt, model);
    const cachedResponse = await redis.get(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    return null;
  } catch (error) {
    console.error("❌ Error getting cached prompt response:", error.message);
    return null;
  }
};

/**
 * Store response in Redis cache for a prompt
 * @param {string} prompt - The prompt
 * @param {string} model - The model slug
 * @param {string} response - The response to cache
 * @returns {Promise<boolean>} True if cached successfully
 */
export const setCachedPromptResponse = async (prompt, model, response) => {
  try {
    const redis = getRedisClient();

    if (!redis || !(await isRedisAvailable())) {
      return false;
    }

    const cacheKey = getPromptCacheKey(prompt, model);
    await redis.setex(cacheKey, PROMPT_CACHE_TTL, response);

    return true;
  } catch (error) {
    console.error("❌ Error caching prompt response:", error.message);
    return false;
  }
};

/**
 * Stream a fake response from cache with artificial delay
 * @param {object} res - Express response object
 * @param {string} cachedResponse - The cached response to stream
 * @param {number} chunkSize - Size of each chunk (default: 5 characters)
 * @param {number} delayMs - Delay between chunks in milliseconds (default: 20ms)
 */
export const streamFakeResponse = async (res, cachedResponse, chunkSize = 5, delayMs = 35) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Split response into chunks
  const chunks = [];
  for (let i = 0; i < cachedResponse.length; i += chunkSize) {
    chunks.push(cachedResponse.slice(i, i + chunkSize));
  }

  // Stream each chunk with delay
  for (const chunk of chunks) {
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
};

export { cachedPrompts };
