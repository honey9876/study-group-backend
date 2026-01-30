/**
 * ====================================
 * USER MODEL (UPDATED - COMPATIBLE)
 * ====================================
 * Mongoose schema and model for User
 * Compatible with existing MongoDB data
 */

import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser } from '../interfaces/IUser';
import { UserRole } from '../enums/UserRole.enum';
import { AUTH_CONSTANTS } from '../utils/constants';

const userSchema = new Schema<IUser>(
  {
    // Core fields (matching your existing data)
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must not exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined for backward compatibility
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
    },
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid phone number'],
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio must not exceed 500 characters'],
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    // Support for legacy userId field (if exists)
    userId: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        delete (ret as any).password;
        delete (ret as any).__v;
        delete (ret as any).userId; // Remove internal userId field
        return ret;
      },
    },
    toObject: {
      transform: function (_doc, ret) {
        delete (ret as any).password;
        delete (ret as any).__v;
        delete (ret as any).userId;
        return ret;
      },
    },
  }
);

/**
 * Indexes
 */
userSchema.index({ email: 1 });
userSchema.index({ username: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Pre-save middleware to auto-generate username from email
 */
userSchema.pre('save', function (next) {
  if (!this.username && this.email) {
    // Generate username from email (before @)
    this.username = this.email.split('@')[0].toLowerCase();
  }
  next();
});

/**
 * Method to compare password
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

/**
 * Method to generate JWT access token
 */
userSchema.methods.generateAuthToken = function (): string {
  const payload = {
    userId: this._id.toString(),
    email: this.email,
    role: this.role,
  };

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: AUTH_CONSTANTS.JWT_EXPIRE,
  });
};

/**
 * Method to generate JWT refresh token
 */
userSchema.methods.generateRefreshToken = function (): string {
  const payload = {
    userId: this._id.toString(),
  };

  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not defined');
  }

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRE,
  });
};

/**
 * Static method to find user by email
 */
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Static method to find user by username
 */
userSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username: username.toLowerCase() });
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;