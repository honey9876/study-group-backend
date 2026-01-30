/**
 * ====================================
 * GROUP SERVICE
 * ====================================
 * Business logic for group operations
 */

import mongoose from 'mongoose';
import Group from '../models/Group.model';
import GroupMember from '../models/GroupMember.model';
import {
  CreateGroupData,
  UpdateGroupData,
  GroupResponse,
  GroupListQuery,
  JoinGroupData,
} from '../types/group.types';
import { MemberRole, MemberStatus } from '../interfaces/IGroupMember';
import { GroupVisibility } from '../enums/GroupVisibility.enum';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from '../utils/apiError';
import { ERROR_MESSAGES } from '../utils/constants';

/**
 * Create a new group
 */
export const createGroup = async (
  userId: string,
  groupData: CreateGroupData
): Promise<GroupResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create group
    const groups = await Group.create(
      [
        {
          ...groupData,
          leader: userId,
          currentMemberCount: 1,
        },
      ],
      { session }
    );

    // Check if group was created
    if (!groups || groups.length === 0 || !groups[0]) {
      throw new BadRequestError('Failed to create group');
    }

    const createdGroup = groups[0];

    // Add creator as leader member
    await GroupMember.create(
      [
        {
          group: createdGroup._id,
          user: userId,
          role: MemberRole.LEADER,
          status: MemberStatus.ACTIVE,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Populate leader info
    const populatedGroup = await Group.findById(createdGroup._id).populate(
      'leader',
      'name email avatar'
    );

    if (!populatedGroup) {
      throw new NotFoundError('Group not found after creation');
    }

    return formatGroupResponse(populatedGroup, userId);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get all groups with filters and pagination
 */
export const getGroups = async (
  query: GroupListQuery,
  userId?: string
): Promise<{ groups: GroupResponse[]; total: number; page: number; totalPages: number }> => {
  const {
    page = 1,
    limit = 10,
    category,
    visibility,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Build filter query
  const filter: any = { isActive: true };

  if (category) {
    filter.category = category;
  }

  if (visibility) {
    filter.visibility = visibility;
  }

  // Only show public groups if user is not authenticated
  if (!userId) {
    filter.visibility = GroupVisibility.PUBLIC;
  }

  // Search functionality
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  // Sort options
  const sortOptions: any = {};
  if (sortBy === 'memberCount') {
    sortOptions.currentMemberCount = sortOrder === 'asc' ? 1 : -1;
  } else if (sortBy === 'title') {
    sortOptions.title = sortOrder === 'asc' ? 1 : -1;
  } else {
    sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
  }

  // Execute query
  const skip = (page - 1) * limit;
  const [groups, total] = await Promise.all([
    Group.find(filter)
      .populate('leader', 'name email avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
    Group.countDocuments(filter),
  ]);

  // Format response with membership info
  const formattedGroups = await Promise.all(
    groups.map((group) => formatGroupResponse(group, userId))
  );

  return {
    groups: formattedGroups,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get group by ID
 */
export const getGroupById = async (
  groupId: string,
  userId?: string
): Promise<GroupResponse> => {
  const group = await Group.findById(groupId)
    .populate('leader', 'name email avatar')
    .lean();

  if (!group) {
    throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
  }

  // Check if group is private and user is not a member
  if (
    group.visibility === GroupVisibility.PRIVATE &&
    userId
  ) {
    const isMember = await GroupMember.findOne({
      group: groupId,
      user: userId,
      status: MemberStatus.ACTIVE,
    });

    if (!isMember && group.leader.toString() !== userId) {
      throw new ForbiddenError('This group is private');
    }
  }

  return formatGroupResponse(group, userId);
};

/**
 * Update group
 */
export const updateGroup = async (
  groupId: string,
  userId: string,
  updateData: UpdateGroupData
): Promise<GroupResponse> => {
  const group = await Group.findById(groupId);

  if (!group) {
    throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
  }

  // Check if user is the leader
  if (group.leader.toString() !== userId) {
    throw new ForbiddenError(ERROR_MESSAGES.ONLY_LEADER);
  }

  // Check if new capacity is less than current member count
  if (updateData.capacity && updateData.capacity < group.currentMemberCount) {
    throw new BadRequestError(
      'Cannot set capacity lower than current member count'
    );
  }

  // Update group
  Object.assign(group, updateData);
  await group.save();

  const updatedGroup = await Group.findById(groupId)
    .populate('leader', 'name email avatar')
    .lean();

  if (!updatedGroup) {
    throw new NotFoundError('Group not found after update');
  }

  return formatGroupResponse(updatedGroup, userId);
};

/**
 * Delete group
 */
export const deleteGroup = async (
  groupId: string,
  userId: string
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
    }

    // Check if user is the leader
    if (group.leader.toString() !== userId) {
      throw new ForbiddenError(ERROR_MESSAGES.ONLY_LEADER);
    }

    // Soft delete group
    group.isActive = false;
    await group.save({ session });

    // Update all members status to inactive
    await GroupMember.updateMany(
      { group: groupId },
      { status: MemberStatus.INACTIVE },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Join group
 */
export const joinGroup = async (
  groupId: string,
  userId: string,
  joinData?: JoinGroupData
): Promise<GroupResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const group = await Group.findById(groupId);

    if (!group || !group.isActive) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
    }

    // Check if group is full
    if (group.currentMemberCount >= group.capacity) {
      throw new ForbiddenError(ERROR_MESSAGES.GROUP_FULL);
    }

    // Check if already a member
    const existingMember = await GroupMember.findOne({
      group: groupId,
      user: userId,
    });

    if (existingMember) {
      if (existingMember.status === MemberStatus.ACTIVE) {
        throw new ConflictError(ERROR_MESSAGES.ALREADY_MEMBER);
      }
      if (existingMember.status === MemberStatus.BANNED) {
        throw new ForbiddenError('You have been banned from this group');
      }
    }

    // Check join code for private groups
    if (group.visibility === GroupVisibility.PRIVATE) {
      if (!joinData?.joinCode || joinData.joinCode !== group.joinCode) {
        throw new BadRequestError('Invalid join code');
      }
    }

    // Create membership or reactivate
    if (existingMember) {
      existingMember.status = MemberStatus.ACTIVE;
      existingMember.joinedAt = new Date();
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

    const updatedGroup = await Group.findById(groupId)
      .populate('leader', 'name email avatar')
      .lean();

    if (!updatedGroup) {
      throw new NotFoundError('Group not found after joining');
    }

    return formatGroupResponse(updatedGroup, userId);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Leave group
 */
export const leaveGroup = async (
  groupId: string,
  userId: string
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
    }

    // Leader cannot leave their own group
    if (group.leader.toString() === userId) {
      throw new BadRequestError(
        'Group leader cannot leave. Please delete the group or transfer leadership first'
      );
    }

    const membership = await GroupMember.findOne({
      group: groupId,
      user: userId,
      status: MemberStatus.ACTIVE,
    });

    if (!membership) {
      throw new NotFoundError(ERROR_MESSAGES.NOT_MEMBER);
    }

    // Remove membership
    await GroupMember.findByIdAndDelete(membership._id, { session });

    // Decrement member count
    group.currentMemberCount = Math.max(0, group.currentMemberCount - 1);
    await group.save({ session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get group members
 */
export const getGroupMembers = async (
  groupId: string,
  userId?: string
): Promise<any[]> => {
  const group = await Group.findById(groupId);

  if (!group) {
    throw new NotFoundError(ERROR_MESSAGES.GROUP_NOT_FOUND);
  }

  // Check if user has access to view members
  if (group.visibility === GroupVisibility.PRIVATE && userId) {
    const isMember = await GroupMember.findOne({
      group: groupId,
      user: userId,
      status: MemberStatus.ACTIVE,
    });

    if (!isMember && group.leader.toString() !== userId) {
      throw new ForbiddenError('You do not have access to view group members');
    }
  }

  const members = await GroupMember.find({
    group: groupId,
    status: MemberStatus.ACTIVE,
  })
    .populate('user', 'name email avatar')
    .sort({ joinedAt: 1 })
    .lean();

  return members.map((member) => ({
    _id: member._id,
    user: member.user,
    role: member.role,
    joinedAt: member.joinedAt,
    lastActive: member.lastActive,
  }));
};

/**
 * Get user's groups
 */
export const getUserGroups = async (userId: string): Promise<GroupResponse[]> => {
  const memberships = await GroupMember.find({
    user: userId,
    status: MemberStatus.ACTIVE,
  })
    .populate({
      path: 'group',
      match: { isActive: true },
      populate: { path: 'leader', select: 'name email avatar' },
    })
    .lean();

  const groups = memberships
    .filter((m) => m.group)
    .map((m) => formatGroupResponse(m.group, userId));

  return Promise.all(groups);
};

/**
 * Format group response with membership info
 */
const formatGroupResponse = async (
  group: any,
  userId?: string
): Promise<GroupResponse> => {
  let memberRole: MemberRole | undefined;
  let isMember = false;

  if (userId) {
    const membership = await GroupMember.findOne({
      group: group._id,
      user: userId,
      status: MemberStatus.ACTIVE,
    }).lean();

    if (membership) {
      memberRole = membership.role;
      isMember = true;
    }
  }

  return {
    _id: group._id.toString(),
    title: group.title,
    description: group.description,
    category: group.category,
    visibility: group.visibility,
    avatar: group.avatar,
    coverImage: group.coverImage,
    capacity: group.capacity,
    currentMemberCount: group.currentMemberCount,
    leader: group.leader,
    goalHours: group.goalHours,
    tags: group.tags,
    joinCode: isMember || group.leader.toString() === userId ? group.joinCode : undefined,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    memberRole,
    isMember,
  };
};

export default {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  getGroupMembers,
  getUserGroups,
};