import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    role: string;
    email: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token attempt:', { error: error.message });
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt:', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path
      });
      throw new AppError('Forbidden: Insufficient permissions', 403);
    }

    next();
  };
};
