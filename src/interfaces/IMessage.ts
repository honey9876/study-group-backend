/**
 * ====================================
 * MESSAGE INTERFACE
 * ====================================
 * Interface for Message model
 */

import { Document, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'voice' | 'video' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: Types.ObjectId;
  reactions: {
    emoji: string;
    users: Types.ObjectId[];
  }[];
  isPinned: boolean;
  isEdited: boolean;
  editHistory: {
    content: string;
    editedAt: Date;
  }[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessagePopulated extends Omit<IMessage, 'sender' | 'groupId' | 'replyTo'> {
  sender: {
    _id: Types.ObjectId;
    fullName: string;
    username: string;
    avatar?: string;
  };
  groupId: {
    _id: Types.ObjectId;
    title: string;
  };
  replyTo?: {
    _id: Types.ObjectId;
    content: string;
    sender: {
      _id: Types.ObjectId;
      fullName: string;
      username: string;
    };
  };
}