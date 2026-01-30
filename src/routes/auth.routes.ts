/**
 * ====================================
 * AUTHENTICATION ROUTES
 * ====================================
 * Routes for user authentication
 */

import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * Public Routes
 */

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Refresh access token
router.post('/refresh', authController.refreshToken);

/**
 * Protected Routes (Require Authentication)
 */

// Get user profile
router.get('/profile', authenticate, authController.getProfile);

// Update user profile
router.put('/profile', authenticate, authController.updateProfile);

// Change password
router.put('/change-password', authenticate, authController.changePassword);

// Delete account
router.delete('/account', authenticate, authController.deleteAccount);

// Logout
router.post('/logout', authenticate, authController.logout);

export default router;