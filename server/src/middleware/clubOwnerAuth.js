import { verifyToken } from '../utils/jwt.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const clubOwnerMiddleware = async (req, res, next) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ message: 'توکن یافت نشد' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: 'توکن نامعتبر است' });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) return res.status(401).json({ message: 'کاربر یافت نشد' });

    // Auto-promote: هر کاربر authenticated که به پنل باشگاه دسترسی داره
    // اگه هنوز isClubOwner نشده، الان ست می‌کنیم
    if (!user.isClubOwner && !user.isAdmin) {
      await db
        .update(users)
        .set({ isClubOwner: true })
        .where(eq(users.id, user.id));
      user.isClubOwner = true;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('clubOwnerMiddleware error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};
