/**
 * ====================================
 * GROUP CONTROLLER
 * ====================================
 * Request handlers for group routes
 */

import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import * as groupService from '../services/group.service';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from '../utils/apiResponse';
import { SUCCESS_MESSAGES } from '../utils/constants';
import {
  createGroupSchema,
  updateGroupSchema,
  joinGroupSchema,
  groupListQuerySchema,
  objectIdSchema,
} from '../validators/group.validator';
import { ValidationError } from '../utils/apiError';

/**
 * @route   POST /api/v1/groups
 * @desc    Create a new group
 * @access  Private
 */
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = createGroupSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  const userId = req.userId!;
  const group = await groupService.createGroup(userId, value);

  return createdResponse(res, group, SUCCESS_MESSAGES.GROUP_CREATED);
});

/**
 * @route   GET /api/v1/groups
 * @desc    Get all groups with filters and pagination
 * @access  Public
 */
export const getGroups = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = groupListQuerySchema.validate(req.query);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  const userId = req.userId;
  const result = await groupService.getGroups(value, userId);

  return paginatedResponse(
    res,
    result.groups,
    result.page,
    value.limit,
    result.total,
    'Groups retrieved successfully'
  );
});

/**
 * @route   GET /api/v1/groups/my-groups
 * @desc    Get user's groups
 * @access  Private
 */
export const getMyGroups = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const groups = await groupService.getUserGroups(userId);

  return successResponse(res, groups, 'Your groups retrieved successfully');
});

/**
 * @route   GET /api/v1/groups/:groupId
 * @desc    Get group by ID
 * @access  Public/Private (depends on visibility)
 */
export const getGroupById = asyncHandler(async (req: Request, res: Response) => {
  const { error } = objectIdSchema.validate(req.params.groupId);
  if (error) {
    throw new ValidationError('Invalid group ID');
  }

  const groupId = req.params.groupId!; // Type assertion after validation
  const userId = req.userId;

  const group = await groupService.getGroupById(groupId, userId);

  return successResponse(res, group, 'Group retrieved successfully');
});

/**
 * @route   PUT /api/v1/groups/:groupId
 * @desc    Update group
 * @access  Private (Leader only)
 */
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const { error: idError } = objectIdSchema.validate(req.params.groupId);
  if (idError) {
    throw new ValidationError('Invalid group ID');
  }

  const { error, value } = updateGroupSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  const groupId = req.params.groupId!; // Type assertion after validation
  const userId = req.userId!;

  const group = await groupService.updateGroup(groupId, userId, value);

  return successResponse(res, group, SUCCESS_MESSAGES.GROUP_UPDATED);
});

/**
 * @route   DELETE /api/v1/groups/:groupId
 * @desc    Delete group (soft delete)
 * @access  Private (Leader only)
 */
export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
  const { error } = objectIdSchema.validate(req.params.groupId);
  if (error) {
    throw new ValidationError('Invalid group ID');
  }

  const groupId = req.params.groupId!; // Type assertion after validation
  const userId = req.userId!;

  await groupService.deleteGroup(groupId, userId);

  return successResponse(res, null, SUCCESS_MESSAGES.GROUP_DELETED);
});

/**
 * @route   POST /api/v1/groups/:groupId/join
 * @desc    Join a group
 * @access  Private
 */
export const joinGroup = asyncHandler(async (req: Request, res: Response) => {
  const { error: idError } = objectIdSchema.validate(req.params.groupId);
  if (idError) {
    throw new ValidationError('Invalid group ID');
  }

  const { error, value } = joinGroupSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  const groupId = req.params.groupId!; // Type assertion after validation
  const userId = req.userId!;

  const group = await groupService.joinGroup(groupId, userId, value);

  return successResponse(res, group, SUCCESS_MESSAGES.JOINED_GROUP);
});

/**
 * @route   POST /api/v1/groups/:groupId/leave
 * @desc    Leave a group
 * @access  Private
 */
export const leaveGroup = asyncHandler(async (req: Request, res: Response) => {
  const { error } = objectIdSchema.validate(req.params.groupId);
  if (error) {
    throw new ValidationError('Invalid group ID');
  }

  const groupId = req.params.groupId!; // Type assertion after validation
  const userId = req.userId!;

  await groupService.leaveGroup(groupId, userId);

  return successResponse(res, null, SUCCESS_MESSAGES.LEFT_GROUP);
});

/**
 * @route   GET /api/v1/groups/:groupId/members
 * @desc    Get group members
 * @access  Public/Private (depends on group visibility)
 */
export const getGroupMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const { error } = objectIdSchema.validate(req.params.groupId);
    if (error) {
      throw new ValidationError('Invalid group ID');
    }

    const groupId = req.params.groupId!; // Type assertion after validation
    const userId = req.userId;

    const members = await groupService.getGroupMembers(groupId, userId);

    return successResponse(res, members, 'Group members retrieved successfully');
  }
);

export default {
  createGroup,
  getGroups,
  getMyGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  getGroupMembers,
};