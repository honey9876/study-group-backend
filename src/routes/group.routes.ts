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
 * Public/Optional Auth Routes
 */

// Get all groups (public, but shows more info if authenticated)
router.get('/', optionalAuth, groupController.getGroups);

// Get group by ID (public for public groups, private for members only)
router.get('/:groupId', optionalAuth, groupController.getGroupById);

// Get group members (public for public groups)
router.get('/:groupId/members', optionalAuth, groupController.getGroupMembers);

/**
 * Protected Routes (Authentication Required)
 */

// Create a new group
router.post('/', authenticate, groupController.createGroup);

// Get user's groups
router.get('/my-groups', authenticate, groupController.getMyGroups);

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

