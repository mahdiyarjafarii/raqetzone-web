export function getVideoPrice({ model, duration, resolution }) {
  const res = String(resolution).replace(/\s/g, "").toLowerCase();

  const normalizedModel = model.trim().toLowerCase().replace(/-/g, " ");

  const normalizedKey = [
    normalizedModel,
    String(duration).trim(),
    res,
  ].join("|");

  const priceTable = {
    // Ltxs - $0.05 per second = 25 credits for 6 seconds
    "fal ai/ltxv 2/text to video/fast|6|1080p": 240,
    "fal ai/ltxv 2/text to video/fast|8|1080p": 320,
    "fal ai/ltxv 2/text to video/fast|10|1080p": 400,
    // Kling 2.5 Turbo Pro - $0.07 per second = 30 credits for 5 seconds
    "fal ai/kling video/v2.5 turbo/pro/text to video|5|720p": 230,
    "fal ai/kling video/v2.5 turbo/pro/text to video|10|720p": 465,
    // Ltxs - $0.05 per second = 25 credits for 5 seconds
    "fal ai/wan 25 preview/text to video|5|480p": 165,
    "fal ai/wan 25 preview/text to video|10|480p": 330,
  };

  return priceTable[normalizedKey] ?? null;
}
