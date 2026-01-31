/**
 * ====================================
 * MESSAGE MODEL
 * ====================================
 * Message schema for group chat
 */

import mongoose, { Schema } from 'mongoose';
import { IMessage } from '../interfaces/IMessage';
import { MessageType } from '../enums/MessageType.enum';

const messageSchema = new Schema<IMessage>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      trim: true,
    },
    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        users: [
          {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [
      {
        content: {
          type: String,
          required: true,
        },
        editedAt: {
          type: Date,
          required: true,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Indexes for better query performance
 */
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ isPinned: 1 });
messageSchema.index({ createdAt: -1 });

/**
 * Virtual: Check if message can be edited (within 15 minutes)
 */
messageSchema.virtual('canEdit').get(function () {
  const fifteenMinutes = 15 * 60 * 1000;
  const timeSinceCreation = Date.now() - this.createdAt.getTime();
  return timeSinceCreation < fifteenMinutes && !this.isDeleted;
});

/**
 * Virtual: Get read count
 */
messageSchema.virtual('readCount').get(function () {
  return this.readBy.length;
});

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;