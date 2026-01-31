/**
 * ====================================
 * MEMBER CONTROLLER
 * ====================================
 * Handle all group member management operations
 */

import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { successResponse, createdResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import Group from '../models/Group.model';
import GroupMember from '../models/GroupMember.model';
import User from '../models/User.model';
import { MemberRole, MemberStatus } from '../interfaces/IGroupMember';
import { ApiError } from '../utils/apiError';
import { HttpStatus } from '../enums/HttpStatus.enum';
import mongoose from 'mongoose';

/**
 * @desc    Join a group
 * @route   POST /api/groups/:groupId/join
 * @access  Private
 */
export const joinGroup = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find group
      const group = await Group.findById(groupId).session(session);

      if (!group || !group.isActive) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
      }

      // Check capacity
      if (group.currentMemberCount >= group.capacity) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'Group has reached maximum capacity'
        );
      }

      // Check if already a member
      const existingMember = await GroupMember.findOne({
        group: groupId,
        user: userId,
      }).session(session);

      if (existingMember && existingMember.status === MemberStatus.ACTIVE) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          'You are already a member of this group'
        );
      }

      if (existingMember && existingMember.status === MemberStatus.BANNED) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'You have been banned from this group'
        );
      }

      // Create or reactivate membership
      if (existingMember) {
        existingMember.status = MemberStatus.ACTIVE;
        existingMember.joinedAt = new Date();
        existingMember.lastActive = new Date();
        await existingMember.save({ session });
      } else {
        await GroupMember.create(
          [
            {
              group: groupId,
              user: userId,
              role: MemberRole.MEMBER,
              status: MemberStatus.ACTIVE,
            },
          ],
          { session }
        );
      }

      // Increment member count
      group.currentMemberCount += 1;
      await group.save({ session });

      await session.commitTransaction();

      // Get updated group with leader info
      const updatedGroup = await Group.findById(groupId).populate(
        'leader',
        'name email avatar'
      );

      successResponse(res, updatedGroup, 'Successfully joined the group');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
);

/**
 * @desc    Leave a group
 * @route   POST /api/groups/:groupId/leave
 * @access  Private
 */
export const leaveGroup = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find group
      const group = await Group.findById(groupId).session(session);

      if (!group) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
      }

      // Leader cannot leave
      if (group.leader.toString() === userId) {
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'Group leader cannot leave. Please delete the group or transfer leadership first'
        );
      }

      // Find membership
      const membership = await GroupMember.findOne({
        group: groupId,
        user: userId,
        status: MemberStatus.ACTIVE,
      }).session(session);

      if (!membership) {
        throw new ApiError(
          HttpStatus.NOT_FOUND,
          'You are not a member of this group'
        );
      }

      // Remove membership
      await GroupMember.findByIdAndDelete(membership._id).session(session);

      // Decrement member count
      group.currentMemberCount = Math.max(0, group.currentMemberCount - 1);
      await group.save({ session });

      await session.commitTransaction();

      successResponse(res, null, 'Successfully left the group');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
);

/**
 * @desc    Add member to group (leader only)
 * @route   POST /api/groups/:groupId/add-member
 * @access  Private (Leader/Admin)
 */
export const addMember = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { userId: memberUserId } = req.body;

    if (!memberUserId) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'User ID is required');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find group
      const group = await Group.findById(groupId).session(session);

      if (!group || !group.isActive) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
      }

      // Check capacity
      if (group.currentMemberCount >= group.capacity) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'Group has reached maximum capacity'
        );
      }

      // Check if user exists
      const user = await User.findById(memberUserId);
      if (!user || !user.isActive) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
      }

      // Check if already a member
      const existingMember = await GroupMember.findOne({
        group: groupId,
        user: memberUserId,
      }).session(session);

      if (existingMember && existingMember.status === MemberStatus.ACTIVE) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          'User is already a member of this group'
        );
      }

      if (existingMember && existingMember.status === MemberStatus.BANNED) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'User has been banned from this group'
        );
      }

      // Create or reactivate membership
      if (existingMember) {
        existingMember.status = MemberStatus.ACTIVE;
        existingMember.joinedAt = new Date();
        existingMember.lastActive = new Date();
        await existingMember.save({ session });
      } else {
        await GroupMember.create(
          [
            {
              group: groupId,
              user: memberUserId,
              role: MemberRole.MEMBER,
              status: MemberStatus.ACTIVE,
            },
          ],
          { session }
        );
      }

      // Increment member count
      group.currentMemberCount += 1;
      await group.save({ session });

      await session.commitTransaction();

      createdResponse(res, { userId: memberUserId }, 'Member added successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
);

/**
 * @desc    Remove member from group (leader only)
 * @route   DELETE /api/groups/:groupId/remove-member/:userId
 * @access  Private (Leader/Admin)
 */
export const removeMember = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { groupId, userId: memberUserId } = req.params;
    const currentUserId = req.userId;

    if (!currentUserId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find group
      const group = await Group.findById(groupId).session(session);

      if (!group) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
      }

      // Cannot remove the leader
      if (group.leader.toString() === memberUserId) {
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'Cannot remove the group leader'
        );
      }

      // Find membership
      const membership = await GroupMember.findOne({
        group: groupId,
        user: memberUserId,
        status: MemberStatus.ACTIVE,
      }).session(session);

      if (!membership) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Member not found in this group');
      }

      // Remove membership
      await GroupMember.findByIdAndDelete(membership._id).session(session);

      // Decrement member count
      group.currentMemberCount = Math.max(0, group.currentMemberCount - 1);
      await group.save({ session });

      await session.commitTransaction();

      successResponse(res, null, 'Member removed successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
);

/**
 * @desc    Get all group members
 * @route   GET /api/groups/:groupId/members
 * @access  Private
 */
export const getGroupMembers = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { groupId } = req.params;

    // Find group
    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
    }

    // Get members
    const members = await GroupMember.find({
      group: groupId,
      status: MemberStatus.ACTIVE,
    })
      .populate('user', 'name email avatar')
      .sort({ joinedAt: 1 })
      .lean();

    const formattedMembers = members.map((member) => ({
      _id: member._id,
      user: member.user,
      role: member.role,
      joinedAt: member.joinedAt,
      lastActive: member.lastActive,
    }));

    successResponse(
      res,
      formattedMembers,
      'Members retrieved successfully',
      HttpStatus.OK,
      { total: formattedMembers.length }
    );
  }
);

/**
 * @desc    Get group member count
 * @route   GET /api/groups/:groupId/member-count
 * @access  Public
 */
export const getMemberCount = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { groupId } = req.params;

    // Find group
    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Group not found');
    }

    const count = await GroupMember.countDocuments({
      group: groupId,
      status: MemberStatus.ACTIVE,
    });

    successResponse(
      res,
      {
        groupId,
        memberCount: count,
        capacity: group.capacity,
        availableSlots: group.capacity - count,
      },
      'Member count retrieved successfully'
    );
  }
);

export default {
  joinGroup,
  leaveGroup,
  addMember,
  removeMember,
  getGroupMembers,
  getMemberCount,
};