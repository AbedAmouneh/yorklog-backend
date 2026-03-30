import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

/**
 * Verifies JWT from httpOnly cookie or Authorization header.
 * Attaches the full user object to req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    // Accept token from cookie (preferred) or Authorization header
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        isActive: true,
        notifyEmail: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};
