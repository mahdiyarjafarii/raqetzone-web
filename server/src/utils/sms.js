import Kavenegar from 'kavenegar';

const apiKey = process.env.KAVENEGAR_API_KEY;
const sender = process.env.KAVENEGAR_SENDER;

const kavenegar = apiKey ? Kavenegar.KavenegarApi({ apikey: apiKey }) : null;

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
  if (!phone) return false;
  try {
    if (!kavenegar || !sender) {
      console.warn('SMS skipped: Kavenegar not configured');
      return false;
    }
    await new Promise((resolve, reject) => {
      kavenegar.Send(
        { message, sender, receptor: phone },
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
 * Send OTP code via SMS
 * @param {string} phone - Mobile phone number
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<boolean>} Success status
 */
export const sendOTP = async (phone, code) => {
  console.log(phone)
  console.log(code)
  try {
    if (!kavenegar || !sender) {
      console.error('SMS sending error: Kavenegar configuration is missing');
      return false;
    }

    await new Promise((resolve, reject) => {
      kavenegar.Send(
        {
          message: `کد تایید راکت زون: ${code}`,
          sender,
          receptor: phone,
        },
        (response, status) => {
          if (status >= 200 && status < 300) return resolve(response);
          const error = new Error(`Kavenegar send failed with status ${status}: ${JSON.stringify(response)}`);
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

