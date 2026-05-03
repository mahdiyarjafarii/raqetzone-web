import { verifyToken } from '../utils/jwt.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const adminMiddleware = async (req, res, next) => {
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
    if (!user.isAdmin) return res.status(403).json({ message: 'دسترسی ادمین لازم است' });

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};
