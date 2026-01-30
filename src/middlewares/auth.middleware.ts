/**
 * ====================================
 * AUTHENTICATION MIDDLEWARE
 * ====================================
 * JWT verification and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import { UnauthorizedError, ForbiddenError } from '../utils/apiError';
import { JWTPayload } from '../types/user.types';
import { UserRole } from '../enums/UserRole.enum';
import asyncHandler from '../utils/asyncHandler';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

/**
 * Verify JWT token and authenticate user
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided. Please login to access this resource');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }

    try {
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as JWTPayload;

      // Find user
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        throw new UnauthorizedError('User not found. Token is invalid');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Your account has been deactivated');
      }

      // Update last active time
      user.lastActive = new Date();
      await user.save();

      // Attach user to request
      req.user = user;
      req.userId = user._id.toString();

      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired. Please login again');
      }
      throw error;
    }
  }
);

/**
 * Check if user has specific role
 */
export const authorize = (...roles: UserRole[]) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Access denied. Required role: ${roles.join(' or ')}`
        );
      }

      next();
    }
  );
};

/**
 * Optional authentication (user can be logged in or not)
 */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as JWTPayload;

      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id.toString();
      }
    } catch (error) {
      // Ignore errors for optional auth
    }

    next();
  }
);

/**
 * Admin only middleware
 */
export const adminOnly = authorize(UserRole.ADMIN);

/**
 * Mentor or Admin middleware
 */
export const mentorOrAdmin = authorize(UserRole.MENTOR, UserRole.ADMIN);

export default {
  authenticate,
  authorize,
  optionalAuth,
  adminOnly,
  mentorOrAdmin,
};