/**
 * ====================================
 * AUTHENTICATION SERVICE
 * ====================================
 * Business logic for authentication operations
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import {
  RegisterUserData,
  LoginUserData,
  AuthResponse,
  UserResponse,
  UpdateProfileData,
  ChangePasswordData,
} from '../types/user.types';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from '../utils/apiError';
import { ERROR_MESSAGES } from '../utils/constants';

/**
 * Register a new user
 */
export const registerUser = async (
  userData: RegisterUserData
): Promise<AuthResponse> => {
  const { email, password, name, role, phone } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ConflictError(ERROR_MESSAGES.USER_ALREADY_EXISTS);
  }

  // Create new user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    phone,
  });

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Convert to plain object and format response
  const userObj = user.toObject();
  const userResponse: UserResponse = {
    _id: userObj._id.toString(),
    name: userObj.name,
    email: userObj.email,
    role: userObj.role,
    avatar: userObj.avatar,
    phone: userObj.phone,
    bio: userObj.bio,
    isEmailVerified: userObj.isEmailVerified,
    isActive: userObj.isActive,
    lastActive: userObj.lastActive,
    createdAt: userObj.createdAt,
    updatedAt: userObj.updatedAt,
  };

  return {
    user: userResponse,
    accessToken,
    refreshToken,
  };
};

/**
 * Login user
 */
export const loginUser = async (
  loginData: LoginUserData
): Promise<AuthResponse> => {
  const { email, password } = loginData;

  // Find user with password field
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password'
  );

  if (!user) {
    throw new UnauthorizedError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Update last active
  user.lastActive = new Date();
  await user.save();

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Convert to plain object and format response
  const userObj = user.toObject();
  const userResponse: UserResponse = {
    _id: userObj._id.toString(),
    name: userObj.name,
    email: userObj.email,
    role: userObj.role,
    avatar: userObj.avatar,
    phone: userObj.phone,
    bio: userObj.bio,
    isEmailVerified: userObj.isEmailVerified,
    isActive: userObj.isActive,
    lastActive: userObj.lastActive,
    createdAt: userObj.createdAt,
    updatedAt: userObj.updatedAt,
  };

  return {
    user: userResponse,
    accessToken,
    refreshToken,
  };
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string): Promise<UserResponse> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  const userObj = user.toObject();
  return {
    _id: userObj._id.toString(),
    name: userObj.name,
    email: userObj.email,
    role: userObj.role,
    avatar: userObj.avatar,
    phone: userObj.phone,
    bio: userObj.bio,
    isEmailVerified: userObj.isEmailVerified,
    isActive: userObj.isActive,
    lastActive: userObj.lastActive,
    createdAt: userObj.createdAt,
    updatedAt: userObj.updatedAt,
  };
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updateData: UpdateProfileData
): Promise<UserResponse> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Update fields
  if (updateData.name) user.name = updateData.name;
  if (updateData.phone !== undefined) user.phone = updateData.phone;
  if (updateData.bio !== undefined) user.bio = updateData.bio;
  if (updateData.avatar !== undefined) user.avatar = updateData.avatar;

  await user.save();

  const userObj = user.toObject();
  return {
    _id: userObj._id.toString(),
    name: userObj.name,
    email: userObj.email,
    role: userObj.role,
    avatar: userObj.avatar,
    phone: userObj.phone,
    bio: userObj.bio,
    isEmailVerified: userObj.isEmailVerified,
    isActive: userObj.isActive,
    lastActive: userObj.lastActive,
    createdAt: userObj.createdAt,
    updatedAt: userObj.updatedAt,
  };
};

/**
 * Change user password
 */
export const changeUserPassword = async (
  userId: string,
  passwordData: ChangePasswordData
): Promise<void> => {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(
    passwordData.currentPassword
  );

  if (!isPasswordValid) {
    throw new BadRequestError('Current password is incorrect');
  }

  // Update password
  user.password = passwordData.newPassword;
  await user.save();
};

/**
 * Delete user account
 */
export const deleteUserAccount = async (userId: string): Promise<void> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Soft delete (deactivate account)
  user.isActive = false;
  await user.save();

  // Or hard delete (uncomment to permanently delete)
  // await User.findByIdAndDelete(userId);
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (
  refreshToken: string
): Promise<{ accessToken: string }> => {
  try {
    const decoded: any = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    );

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const accessToken = user.generateAuthToken();

    return { accessToken };
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

export default {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
  refreshAccessToken,
};