/**
 * Validate image reference for video generation
 * @param {string} imageReference - URL or data URI of the image
 * @param {Object} config - Video configuration with aspectRatio and resolution
 * @returns {Promise<{isValid: boolean, message?: string}>}
 */
export async function validateImageReference(imageReference, config) {
  try {
    // Check supported formats
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    
    // For data URIs
    if (imageReference.startsWith('data:image/')) {
      const mimeType = imageReference.split(';')[0].split(':')[1];
      if (!supportedFormats.includes(mimeType)) {
        return {
          isValid: false,
          message: 'فرمت تصویر پشتیبانی نمی‌شود. فرمت‌های مجاز: JPEG, PNG, WebP'
        };
      }
      return { isValid: true };
    }
    
    // For URLs, we can't easily validate without downloading
    // Basic URL validation was already done in controller
    if (imageReference.startsWith('http://') || imageReference.startsWith('https://')) {
      return { isValid: true };
    }
    
    return {
      isValid: false,
      message: 'فرمت لینک تصویر نامعتبر است'
    };
    
  } catch (error) {
    console.error('Image validation error:', error);
    return {
      isValid: false,
      message: 'خطا در اعتبارسنجی تصویر'
    };
  }
}