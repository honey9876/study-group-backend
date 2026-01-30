/**
 * ====================================
 * USER INTERFACE
 * ====================================
 * TypeScript interface for User model
 */

import { Document, ObjectId } from 'mongoose';
import { UserRole } from '../enums/UserRole.enum';

export interface IUser extends Document {
    _id: ObjectId;
    name: string;
    email: string;
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

export default IUser;