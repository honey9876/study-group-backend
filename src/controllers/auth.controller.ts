/**
 * ====================================
 * AUTHENTICATION CONTROLLER
 * ====================================
 * Request handlers for authentication routes
 */

import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import * as authService from '../services/auth.service';
import {
  successResponse,
  createdResponse,
} from '../utils/apiResponse';
import { SUCCESS_MESSAGES } from '../utils/constants';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/auth.validator';
import { ValidationError } from '../utils/apiError';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  // Register user
  const authResponse = await authService.registerUser(value);

  return createdResponse(res, authResponse, SUCCESS_MESSAGES.REGISTER_SUCCESS);
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  // Login user
  const authResponse = await authService.loginUser(value);

  return successResponse(res, authResponse, SUCCESS_MESSAGES.LOGIN_SUCCESS);
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get logged-in user profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const userProfile = await authService.getUserProfile(userId);

  return successResponse(res, userProfile, 'Profile retrieved successfully');
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Validation failed', error.details);
    }

    const userId = req.userId!;

    const updatedProfile = await authService.updateUserProfile(userId, value);

    return successResponse(
      res,
      updatedProfile,
      SUCCESS_MESSAGES.UPDATED
    );
  }
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate request body
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Validation failed', error.details);
    }

    const userId = req.userId!;

    await authService.changeUserPassword(userId, value);

    return successResponse(res, null, 'Password changed successfully');
  }
);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account
 * @access  Private
 */
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId!;

    await authService.deleteUserAccount(userId);

    return successResponse(res, null, 'Account deleted successfully');
  }
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    return successResponse(res, tokens, 'Token refreshed successfully');
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // In a real app, you might want to:
  // 1. Blacklist the token
  // 2. Clear cookies
  // 3. Remove from Redis session store

  return successResponse(res, null, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
});

export default {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  refreshToken,
  logout,
};