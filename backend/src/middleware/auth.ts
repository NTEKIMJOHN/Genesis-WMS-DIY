import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: UserRole;
  };
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      tenantId: string;
      role: UserRole;
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

/**
 * Check if user has required role
 * @param roles - Array of allowed roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Middleware to ensure user belongs to specified tenant
 */
export const validateTenant = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const tenantIdFromParams = req.params.tenantId || req.body.tenantId;

  if (!tenantIdFromParams) {
    return next();
  }

  if (
    req.user?.role !== 'PLATFORM_ADMIN' &&
    req.user?.tenantId !== tenantIdFromParams
  ) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Cannot access other tenant data',
    });
  }

  next();
};
