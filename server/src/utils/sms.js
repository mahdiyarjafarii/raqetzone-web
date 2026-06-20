import Kavenegar from 'kavenegar';

const apiKey = process.env.KAVENEGAR_API_KEY;
const sender = process.env.KAVENEGAR_SENDER;

const kavenegar = apiKey ? Kavenegar.KavenegarApi({ apikey: apiKey }) : null;
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

function normalizePhone(phone) {
  if (!phone) return "";
  let normalized = String(phone)
    .trim()
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[^\d+]/g, "");

  if (normalized.startsWith("+98")) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith("98") && normalized.length === 12) normalized = `0${normalized.slice(2)}`;

  return normalized;
}

/**
 * Generate a random 4-digit OTP code
 * @returns {string} 4-digit code
 */
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Send a plain text SMS notification to a user.
 * @param {string} phone
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export const sendSMS = async (phone, message) => {
  const receptor = normalizePhone(phone);
  if (!receptor) return false;
  try {
    if (!kavenegar || !sender) {
      console.warn('SMS skipped: Kavenegar not configured');
      return false;
    }
    await new Promise((resolve, reject) => {
      kavenegar.Send(
        { message, sender, receptor },
        (response, status) => {
          if (status >= 200 && status < 300) return resolve(response);
          return reject(new Error(`Kavenegar status ${status}`));
        }
      );
    });
    return true;
  } catch (err) {
    console.error('sendSMS error:', err.message);
    return false;
  }
};

/**
 * Send SMS to all users with a phone number (fire-and-forget).
 * @param {string} message
 */
export const broadcastSMS = async (message) => {
  try {
    const { db } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');
    const allUsers = await db.select({ phone: users.phone }).from(users);
    const phones = allUsers.map(u => normalizePhone(u.phone)).filter(Boolean);
    for (const phone of phones) {
      sendSMS(phone, message).catch(err => console.error(`[broadcastSMS] ${phone}:`, err.message));
    }
    console.log(`[broadcastSMS] queued ${phones.length} SMS`);
  } catch (err) {
    console.error('[broadcastSMS] error:', err.message);
  }
};

/**
 * Send OTP code via SMS
 * @param {string} phone - Mobile phone number
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<boolean>} Success status
 */
export const sendOTP = async (phone, code) => {
  const receptor = normalizePhone(phone);
  if (!receptor) return false;

  try {
    if (!kavenegar) {
      console.error('SMS sending error: Kavenegar configuration is missing');
      return false;
    }

    await new Promise((resolve, reject) => {
      kavenegar.VerifyLookup(
        {
          receptor,
          token: String(code),
          template: 'token',
        },
        (response, status) => {
          if (status >= 200 && status < 300) return resolve(response);
          const error = new Error(`Kavenegar verify lookup failed with status ${status}: ${JSON.stringify(response)}`);
          error.response = response;
          error.status = status;
          return reject(error);
        }
      );
    });
    return true;
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
};

