/**
 * ====================================
 * GROUP ROUTES
 * ====================================
 * API routes for group management
 */

import { Router } from 'express';
import * as groupController from '../controllers/group.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
import {
  isLeader,
  isNotMember,
  isGroupNotFull,
  isMember,
} from '../middlewares/groupAccess.middleware';

const router = Router();

/**
 * IMPORTANT: Specific routes MUST come BEFORE dynamic routes
 * Order matters in Express routing!
 */

/**
 * Public/Optional Auth Routes
 */

// Get all groups (public, but shows more info if authenticated)
router.get('/', optionalAuth, groupController.getGroups);

/**
 * Protected Routes (Authentication Required)
 * MUST be before dynamic :groupId routes
 */

// Get user's groups - SPECIFIC ROUTE FIRST
router.get('/my-groups', authenticate, groupController.getMyGroups);

// Create a new group
router.post('/', authenticate, groupController.createGroup);

/**
 * Dynamic Routes with :groupId parameter
 * MUST come AFTER all specific routes
 */

// Get group by ID (public for public groups, private for members only)
router.get('/:groupId', optionalAuth, groupController.getGroupById);

// Get group members (public for public groups)
router.get('/:groupId/members', optionalAuth, groupController.getGroupMembers);

// Update group (leader only)
router.put('/:groupId', authenticate, isLeader, groupController.updateGroup);

// Delete group (leader only)
router.delete('/:groupId', authenticate, isLeader, groupController.deleteGroup);

// Join group
router.post(
  '/:groupId/join',
  authenticate,
  isNotMember,
  isGroupNotFull,
  groupController.joinGroup
);

// Leave group
router.post('/:groupId/leave', authenticate, isMember, groupController.leaveGroup);

export default router;
