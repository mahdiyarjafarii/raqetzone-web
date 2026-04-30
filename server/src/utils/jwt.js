import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '30d';

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

