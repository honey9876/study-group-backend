/**
 * ====================================
 * GROUP MEMBER MODEL
 * ====================================
 */

import mongoose, { Schema } from 'mongoose';
import { IGroupMember, MemberRole, MemberStatus } from '../interfaces/IGroupMember';

const groupMemberSchema = new Schema<IGroupMember>(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(MemberRole),
      default: MemberRole.MEMBER,
    },
    status: {
      type: String,
      enum: Object.values(MemberStatus),
      default: MemberStatus.ACTIVE,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes
 */
groupMemberSchema.index({ group: 1, user: 1 }, { unique: true });
groupMemberSchema.index({ group: 1 });
groupMemberSchema.index({ user: 1 });
groupMemberSchema.index({ role: 1 });
groupMemberSchema.index({ status: 1 });

const GroupMember = mongoose.model<IGroupMember>('GroupMember', groupMemberSchema);

export default GroupMember;