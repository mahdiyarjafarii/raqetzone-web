/**
 * Validate Iranian phone number format (09xxxxxxxxx)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid
 */
export const validateIranianPhone = (phone) => {
  const phoneRegex = /^09\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate OTP code format (4 digits)
 * @param {string} code - OTP code to validate
 * @returns {boolean} Is valid
 */
export const validateOTPCode = (code) => {
  const codeRegex = /^\d{4}$/;
  return codeRegex.test(code);
};

