/**
 * ====================================
 * GROUP TYPES
 * ====================================
 */

import { GroupCategory } from '../enums/GroupCategory.enum';
import { GroupVisibility } from '../enums/GroupVisibility.enum';
import { MemberRole } from '../interfaces/IGroupMember';

/**
 * Create Group Data
 */
export interface CreateGroupData {
  title: string;
  description?: string;
  category: GroupCategory;
  visibility: GroupVisibility;
  capacity?: number;
  goalHours?: number;
  tags?: string[];
}

/**
 * Update Group Data
 */
export interface UpdateGroupData {
  title?: string;
  description?: string;
  category?: GroupCategory;
  visibility?: GroupVisibility;
  capacity?: number;
  goalHours?: number;
  tags?: string[];
  avatar?: string;
  coverImage?: string;
}

/**
 * Group Response
 */
export interface GroupResponse {
  _id: string;
  title: string;
  description?: string;
  category: GroupCategory;
  visibility: GroupVisibility;
  avatar?: string;
  coverImage?: string;
  capacity: number;
  currentMemberCount: number;
  leader: any;
  goalHours?: number;
  tags?: string[];
  joinCode?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  memberRole?: MemberRole;
  isMember?: boolean;
}

/**
 * Group List Query
 */
export interface GroupListQuery {
  page?: number;
  limit?: number;
  category?: GroupCategory;
  visibility?: GroupVisibility;
  search?: string;
  sortBy?: 'createdAt' | 'memberCount' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Join Group Data
 */
export interface JoinGroupData {
  joinCode?: string;
}