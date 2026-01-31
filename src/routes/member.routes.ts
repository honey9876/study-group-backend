/**
 * ====================================
 * MEMBER ROUTES
 * ====================================
 * Routes for group member management
 */

import { Router } from 'express';
import {
  joinGroup,
  leaveGroup,
  addMember,
  removeMember,
  getGroupMembers,
  getMemberCount,
} from '../controllers/member.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isMember } from '../middlewares/groupAccess.middleware';
import {
  isLeaderOrAdmin,
  checkGroupCapacity,
  isNotMember,
} from '../middlewares/permission.middleware';

const router = Router();

/**
 * @route   POST /api/groups/:groupId/join
 * @desc    Join a group
 * @access  Private
 */
router.post(
  '/:groupId/join',
  authenticate,
  isNotMember,
  checkGroupCapacity,
  joinGroup
);

/**
 * @route   POST /api/groups/:groupId/leave
 * @desc    Leave a group
 * @access  Private
 */
router.post('/:groupId/leave', authenticate, isMember, leaveGroup);

/**
 * @route   POST /api/groups/:groupId/add-member
 * @desc    Add member to group (leader/admin only)
 * @access  Private (Leader/Admin)
 */
router.post(
  '/:groupId/add-member',
  authenticate,
  isLeaderOrAdmin,
  checkGroupCapacity,
  addMember
);

/**
 * @route   DELETE /api/groups/:groupId/remove-member/:userId
 * @desc    Remove member from group (leader/admin only)
 * @access  Private (Leader/Admin)
 */
router.delete(
  '/:groupId/remove-member/:userId',
  authenticate,
  isLeaderOrAdmin,
  removeMember
);

/**
 * @route   GET /api/groups/:groupId/members
 * @desc    Get all group members
 * @access  Private
 */
router.get('/:groupId/members', authenticate, isMember, getGroupMembers);

/**
 * @route   GET /api/groups/:groupId/member-count
 * @desc    Get group member count
 * @access  Public
 */
router.get('/:groupId/member-count', getMemberCount);

export default router;