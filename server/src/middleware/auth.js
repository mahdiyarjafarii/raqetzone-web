import { verifyToken } from '../utils/jwt.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const PROFILE_COMPLETION_ALLOWED_ROUTES = new Set([
  'GET /api/users/me',
  'PATCH /api/users/me',
  'POST /api/users/upload-image',
  'POST /api/users/upload-image/debug-log',
]);

const hasBasicProfile = (user) => {
  const firstName = typeof user?.firstName === 'string' ? user.firstName.trim() : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName.trim() : '';
  return Boolean(firstName && lastName);
};

const canAccessWhileProfileIncomplete = (req) => {
  const routeKey = `${req.method} ${req.baseUrl}${req.path}`;
  return PROFILE_COMPLETION_ALLOWED_ROUTES.has(routeKey);
};

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ message: 'دسترسی غیر مجاز - توکن یافت نشد' });

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'توکن نامعتبر است' });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: 'کاربر یافت نشد' });
    }

    const isClubOwnerAccount = Boolean(user.isClubOwner);
    const isProfileComplete = hasBasicProfile(user);

    if (!isClubOwnerAccount && !isProfileComplete && !canAccessWhileProfileIncomplete(req)) {
      return res.status(403).json({
        message: 'برای استفاده از اپ، تکمیل نام و نام خانوادگی الزامی است',
        code: 'PROFILE_INCOMPLETE',
        missingFields: ['firstName', 'lastName'],
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

