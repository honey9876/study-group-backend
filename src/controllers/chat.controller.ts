/**
 * ====================================
 * CHAT CONTROLLER
 * ====================================
 * Handles group chat operations
 */

import { Request, Response } from 'express';
import Message from '../models/Message.model';
import Group from '../models/Group.model';
import asyncHandler from '../utils/asyncHandler';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from '../utils/apiResponse';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../utils/apiError';
import {
  sendMessageSchema,
  editMessageSchema,
  reactToMessageSchema,
  getMessagesQuerySchema,
} from '../validators/chat.validator';
import { MessageType } from '../enums/MessageType.enum';

/**
 * @desc    Send message in group
 * @route   POST /api/v1/chat/:groupId/send
 * @access  Private (Group Members Only)
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId!;

  // Validate request body
  const { error, value } = sendMessageSchema.validate(req.body);
  if (error) {
    throw new BadRequestError(error.details[0]?.message || 'Validation failed');
  }

  const { content, messageType, fileUrl, fileName, fileSize, replyTo } = value;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found');
  }

  // Check if replying to a valid message
  if (replyTo) {
    const replyMessage = await Message.findById(replyTo);
    if (!replyMessage || replyMessage.groupId.toString() !== groupId) {
      throw new BadRequestError('Invalid reply message');
    }
  }

  // Create message
  const message = await Message.create({
    groupId,
    sender: userId,
    content,
    messageType: messageType || MessageType.TEXT,
    fileUrl,
    fileName,
    fileSize,
    replyTo,
  });

  // Populate sender details
  await message.populate('sender', 'fullName username avatar');
  if (replyTo) {
    await message.populate({
      path: 'replyTo',
      select: 'content sender',
      populate: {
        path: 'sender',
        select: 'fullName username',
      },
    });
  }

  return createdResponse(res, message, 'Message sent successfully');
});

/**
 * @desc    Get chat history of a group
 * @route   GET /api/v1/chat/:groupId/messages
 * @access  Private (Group Members Only)
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;

  // Validate query params
  const { error, value } = getMessagesQuerySchema.validate(req.query);
  if (error) {
    throw new BadRequestError(error.details[0]?.message || 'Validation failed');
  }

  const { page, limit, before, after } = value;

  // Build query
  const query: any = {
    groupId,
    isDeleted: false,
  };

  if (before) {
    query._id = { $lt: before };
  }

  if (after) {
    query._id = { $gt: after };
  }

  // Count total messages
  const total = await Message.countDocuments(query);

  // Fetch messages with pagination
  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'fullName username avatar')
    .populate({
      path: 'replyTo',
      select: 'content sender',
      populate: {
        path: 'sender',
        select: 'fullName username',
      },
    })
    .lean();

  return paginatedResponse(
    res,
    messages.reverse(), // Reverse to show oldest first
    page,
    limit,
    total,
    'Messages fetched successfully'
  );
});

/**
 * @desc    Edit message
 * @route   PUT /api/v1/chat/message/:messageId
 * @access  Private (Message Owner Only)
 */
export const editMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  // Validate request body
  const { error, value } = editMessageSchema.validate(req.body);
  if (error) {
    throw new BadRequestError(error.details[0]?.message || 'Validation failed');
  }

  const { content } = value;

  // Find message
  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Check if user is the sender
  if (message.sender.toString() !== userId) {
    throw new ForbiddenError('You can only edit your own messages');
  }

  // Check if message is deleted
  if (message.isDeleted) {
    throw new BadRequestError('Cannot edit deleted message');
  }

  // Check if message can be edited (within 15 minutes)
  const fifteenMinutes = 15 * 60 * 1000;
  const timeSinceCreation = Date.now() - message.createdAt.getTime();
  if (timeSinceCreation > fifteenMinutes) {
    throw new ForbiddenError('Message can only be edited within 15 minutes');
  }

  // Save edit history
  message.editHistory.push({
    content: message.content,
    editedAt: new Date(),
  });

  // Update message
  message.content = content;
  message.isEdited = true;
  await message.save();

  await message.populate('sender', 'fullName username avatar');

  return successResponse(res, message, 'Message updated successfully');
});

/**
 * @desc    Delete message
 * @route   DELETE /api/v1/chat/message/:messageId
 * @access  Private (Message Owner or Group Leader)
 */
export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  // Find message
  const message = await Message.findById(messageId).populate('groupId');
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  const group = await Group.findById(message.groupId);
  if (!group) {
    throw new NotFoundError('Group not found');
  }

  // Check if user is sender or group leader
  const isSender = message.sender.toString() === userId;
  const isLeader = group.leader.toString() === userId;

  if (!isSender && !isLeader) {
    throw new ForbiddenError('You can only delete your own messages or be a group leader');
  }

  // Soft delete
  message.isDeleted = true;
  message.deletedAt = new Date();
  message.deletedBy = userId as any;
  await message.save();

  return successResponse(res, null, 'Message deleted successfully');
});

/**
 * @desc    React to message
 * @route   POST /api/v1/chat/message/:messageId/react
 * @access  Private (Group Members Only)
 */
export const reactToMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  // Validate request body
  const { error, value } = reactToMessageSchema.validate(req.body);
  if (error) {
    throw new BadRequestError(error.details[0]?.message || 'Validation failed');
  }

  const { emoji } = value;

  // Find message
  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Check if reaction already exists
  const existingReaction = message.reactions.find((r) => r.emoji === emoji);

  if (existingReaction) {
    // Check if user already reacted
    const userIndex = existingReaction.users.findIndex(
      (u) => u.toString() === userId
    );

    if (userIndex > -1) {
      // Remove reaction
      existingReaction.users.splice(userIndex, 1);
      // Remove reaction if no users left
      if (existingReaction.users.length === 0) {
        message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      // Add user to reaction
      existingReaction.users.push(userId as any);
    }
  } else {
    // Add new reaction
    message.reactions.push({
      emoji,
      users: [userId as any],
    });
  }

  await message.save();
  await message.populate('sender', 'fullName username avatar');

  return successResponse(res, message, 'Reaction updated successfully');
});

/**
 * @desc    Pin/Unpin message
 * @route   PATCH /api/v1/chat/message/:messageId/pin
 * @access  Private (Group Leader Only)
 */
export const togglePinMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  // Find message
  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Check if user is group leader
  const group = await Group.findById(message.groupId);
  if (!group) {
    throw new NotFoundError('Group not found');
  }

  if (group.leader.toString() !== userId) {
    throw new ForbiddenError('Only group leader can pin messages');
  }

  // Check pinned messages count
  if (!message.isPinned) {
    const pinnedCount = await Message.countDocuments({
      groupId: message.groupId,
      isPinned: true,
    });

    if (pinnedCount >= 5) {
      throw new BadRequestError('Maximum 5 messages can be pinned per group');
    }
  }

  // Toggle pin
  message.isPinned = !message.isPinned;
  await message.save();
  await message.populate('sender', 'fullName username avatar');

  return successResponse(
    res,
    message,
    message.isPinned ? 'Message pinned successfully' : 'Message unpinned successfully'
  );
});

/**
 * @desc    Get pinned messages
 * @route   GET /api/v1/chat/:groupId/pinned
 * @access  Private (Group Members Only)
 */
export const getPinnedMessages = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;

  const pinnedMessages = await Message.find({
    groupId,
    isPinned: true,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .populate('sender', 'fullName username avatar')
    .lean();

  return successResponse(res, pinnedMessages, 'Pinned messages fetched successfully');
});

/**
 * @desc    Mark message as read
 * @route   PATCH /api/v1/chat/message/:messageId/read
 * @access  Private (Group Members Only)
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Add user to readBy if not already
  if (!message.readBy.includes(userId as any)) {
    message.readBy.push(userId as any);
    await message.save();
  }

  return successResponse(res, null, 'Message marked as read');
});

/**
 * @desc    Get message read status
 * @route   GET /api/v1/chat/message/:messageId/read-status
 * @access  Private (Group Members Only)
 */
export const getReadStatus = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId)
    .populate('readBy', 'fullName username avatar')
    .lean();

  if (!message) {
    throw new NotFoundError('Message not found');
  }

  return successResponse(
    res,
    {
      readCount: message.readBy.length,
      readBy: message.readBy,
    },
    'Read status fetched successfully'
  );
});

/**
 * @desc    Search messages in group
 * @route   GET /api/v1/chat/:groupId/search
 * @access  Private (Group Members Only)
 */
export const searchMessages = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { query, page = 1, limit = 20 } = req.query;

  if (!query || typeof query !== 'string') {
    throw new BadRequestError('Search query is required');
  }

  const searchQuery = {
    groupId,
    isDeleted: false,
    content: { $regex: query, $options: 'i' },
  };

  const total = await Message.countDocuments(searchQuery);

  const messages = await Message.find(searchQuery)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('sender', 'fullName username avatar')
    .lean();

  return paginatedResponse(
    res,
    messages,
    Number(page),
    Number(limit),
    total,
    'Search results fetched successfully'
  );
});