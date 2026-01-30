/**
 * ====================================
 * GROUP MEMBER INTERFACE
 * ====================================
 */

import { Document, Types } from 'mongoose';

export enum MemberRole {
  LEADER = 'leader',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

export interface IGroupMember extends Document {
  _id: Types.ObjectId;
  group: Types.ObjectId;
  user: Types.ObjectId;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: Date;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default IGroupMember;