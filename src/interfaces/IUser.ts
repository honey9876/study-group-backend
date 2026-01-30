/**
 * ====================================
 * USER INTERFACE
 * ====================================
 * TypeScript interface for User model
 */

import { Document, Types } from 'mongoose';
import { UserRole } from '../enums/UserRole.enum';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  username?: string;
  password: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  bio?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

// Add static methods interface
export interface IUserModel extends Document {
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
}

export default IUser;