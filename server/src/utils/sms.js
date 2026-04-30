import { Smsir } from 'smsir-js';

const apiKey = process.env.SMSIR_API_KEY;
const lineNumber = process.env.SMSIR_LINE_NUMBER;
const templateId = parseInt(process.env.SMSIR_TEMPLATE_ID);

const smsir = new Smsir(apiKey, lineNumber);

/**
 * Generate a random 4-digit OTP code
 * @returns {string} 4-digit code
 */
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Send OTP code via SMS
 * @param {string} phone - Mobile phone number
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<boolean>} Success status
 */
export const sendOTP = async (phone, code) => {
  try {
    const parameters = [
      {
        name: 'Code',
        value: code,
      },
    ];

    await smsir.SendVerifyCode(phone, templateId, parameters);
    return true;
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
};

