/**
 * ====================================
 * AUTHENTICATION VALIDATORS
 * ====================================
 * Validation schemas for auth-related requests
 */

import Joi from 'joi';
import { UserRole } from '../enums/UserRole.enum';

/**
 * Register User Validation Schema
 */
export const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 50 characters',
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),

  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password must not exceed 128 characters',
    }),

  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .default(UserRole.STUDENT),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Please provide a valid 10-digit phone number',
    }),
});

/**
 * Login User Validation Schema
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
    }),
});

/**
 * Update Profile Validation Schema
 */
export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 50 characters',
    }),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Please provide a valid 10-digit phone number',
    }),

  bio: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Bio must not exceed 500 characters',
    }),

  avatar: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'Avatar must be a valid URL',
    }),
});

/**
 * Change Password Validation Schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
    }),

  newPassword: Joi.string()
    .min(6)
    .max(128)
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 6 characters',
      'string.max': 'New password must not exceed 128 characters',
      'any.invalid': 'New password must be different from current password',
    }),
});

export default {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
};