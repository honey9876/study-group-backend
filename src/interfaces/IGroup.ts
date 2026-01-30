/**
 * ====================================
 * GROUP INTERFACE
 * ====================================
 * TypeScript interface for Group model
 */

import { Document, Types } from 'mongoose';
import { GroupCategory } from '../enums/GroupCategory.enum';
import { GroupVisibility } from '../enums/GroupVisibility.enum';

export interface IGroup extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  category: GroupCategory;
  visibility: GroupVisibility;
  avatar?: string;
  coverImage?: string;
  capacity: number;
  currentMemberCount: number;
  leader: Types.ObjectId;
  goalHours?: number;
  tags?: string[];
  joinCode?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default IGroup;