import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and extract user information
 * @param {string} token - Google ID token
 * @returns {Promise<Object|null>} User info or null if invalid
 */
export const verifyGoogleToken = async (token) => {
  try {
    // Use access token to fetch user info from Google's userinfo endpoint
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const payload = await response.json();

    return {
      googleId: payload.id,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.verified_email,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    return null;
  }
};
