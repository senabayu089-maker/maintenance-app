
import jwt from 'jsonwebtoken';

import { prisma } from '../config/database.js';
import { config } from '../config/env.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required.',
      });
    }

    const token = authorization.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or has expired.',
      });
    }

    const userId = Number(decoded.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is unavailable or inactive.',
      });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
};
