import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

/**
 * Register a new user
 * @route POST /api/v1/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/v1/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * @route POST /api/v1/auth/refresh
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @route GET /api/v1/auth/profile
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const profile = await authService.getProfile(req.user!.id);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PATCH /api/v1/auth/profile
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const profile = await authService.updateProfile(req.user!.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * @route POST /api/v1/auth/change-password
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
