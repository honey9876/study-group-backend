/**
 * ====================================
 * PERMISSION MIDDLEWARE
 * ====================================
 * Advanced permission checks for group operations
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { ApiError } from '../utils/apiError';
import { HttpStatus } from '../enums/HttpStatus.enum';
import Group from '../models/Group.model';
import GroupMember from '../models/GroupMember.model';
import { MemberRole, MemberStatus } from '../interfaces/IGroupMember';

/**
 * Check if user is the group leader
 */
export const isGroupLeader = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    // Find group
    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
    }

    // Check if user is the leader
    if (group.leader.toString() !== userId.toString()) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'Only group leader can perform this action'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user is a member of the group
 */
export const isGroupMember = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    // Check membership
    const membership = await GroupMember.findOne({
      group: groupId,
      user: userId,
      status: MemberStatus.ACTIVE,
    });

    if (!membership) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'You are not a member of this group'
      );
    }

    // Attach membership to request
    (req as any).membership = membership;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user is leader or admin
 */
export const isLeaderOrAdmin = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
    }

    // Check if leader
    if (group.leader.toString() === userId.toString()) {
      (req as any).isLeader = true;
      return next();
    }

    // Check if admin
    const membership = await GroupMember.findOne({
      group: groupId,
      user: userId,
      role: MemberRole.ADMIN,
      status: MemberStatus.ACTIVE,
    });

    if (!membership) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'Only group leader or admin can perform this action'
      );
    }

    (req as any).isAdmin = true;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user can manage members (leader or admin)
 */
export const canManageMembers = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
    }

    // Check if leader
    if (group.leader.toString() === userId.toString()) {
      return next();
    }

    // Check if admin
    const membership = await GroupMember.findOne({
      group: groupId,
      user: userId,
      role: MemberRole.ADMIN,
      status: MemberStatus.ACTIVE,
    });

    if (!membership) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'You do not have permission to manage members'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if group is not full
 */
export const checkGroupCapacity = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
    }

    if (group.currentMemberCount >= group.capacity) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'Group has reached maximum capacity'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user is NOT already a member
 */
export const isNotMember = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const membership = await GroupMember.findOne({
      group: groupId,
      user: userId,
    });

    if (membership && membership.status === MemberStatus.ACTIVE) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'You are already a member of this group'
      );
    }

    if (membership && membership.status === MemberStatus.BANNED) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'You have been banned from this group'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default {
  isGroupLeader,
  isGroupMember,
  isLeaderOrAdmin,
  canManageMembers,
  checkGroupCapacity,
  isNotMember,
};