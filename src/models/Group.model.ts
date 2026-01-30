/**
 * ====================================
 * GROUP MODEL
 * ====================================
 */

import mongoose, { Schema } from 'mongoose';
import { IGroup } from '../interfaces/IGroup';
import { GroupCategory } from '../enums/GroupCategory.enum';
import { GroupVisibility } from '../enums/GroupVisibility.enum';
import { GROUP_CONSTANTS } from '../utils/constants';

const groupSchema = new Schema<IGroup>(
  {
    title: {
      type: String,
      required: [true, 'Group title is required'],
      trim: true,
      minlength: [GROUP_CONSTANTS.TITLE_MIN_LENGTH, `Title must be at least ${GROUP_CONSTANTS.TITLE_MIN_LENGTH} characters`],
      maxlength: [GROUP_CONSTANTS.TITLE_MAX_LENGTH, `Title must not exceed ${GROUP_CONSTANTS.TITLE_MAX_LENGTH} characters`],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [GROUP_CONSTANTS.DESCRIPTION_MAX_LENGTH, `Description must not exceed ${GROUP_CONSTANTS.DESCRIPTION_MAX_LENGTH} characters`],
    },
    category: {
      type: String,
      enum: Object.values(GroupCategory),
      required: [true, 'Group category is required'],
    },
    visibility: {
      type: String,
      enum: Object.values(GroupVisibility),
      default: GroupVisibility.PUBLIC,
    },
    avatar: {
      type: String,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    capacity: {
      type: Number,
      default: GROUP_CONSTANTS.DEFAULT_CAPACITY,
      min: [GROUP_CONSTANTS.MIN_CAPACITY, `Capacity must be at least ${GROUP_CONSTANTS.MIN_CAPACITY}`],
      max: [GROUP_CONSTANTS.MAX_CAPACITY, `Capacity cannot exceed ${GROUP_CONSTANTS.MAX_CAPACITY}`],
    },
    currentMemberCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    leader: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    goalHours: {
      type: Number,
      min: [GROUP_CONSTANTS.GOAL_HOURS_MIN, `Goal hours must be at least ${GROUP_CONSTANTS.GOAL_HOURS_MIN}`],
      max: [GROUP_CONSTANTS.GOAL_HOURS_MAX, `Goal hours cannot exceed ${GROUP_CONSTANTS.GOAL_HOURS_MAX}`],
    },
    tags: {
      type: [String],
      default: [],
    },
    joinCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Indexes
 */
groupSchema.index({ title: 'text', description: 'text' });
groupSchema.index({ category: 1 });
groupSchema.index({ visibility: 1 });
groupSchema.index({ leader: 1 });
groupSchema.index({ isActive: 1 });
groupSchema.index({ createdAt: -1 });
groupSchema.index({ joinCode: 1 }, { sparse: true });

/**
 * Generate unique join code for private groups
 */
groupSchema.pre('save', function (next) {
  if (this.visibility === GroupVisibility.PRIVATE && !this.joinCode) {
    this.joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

const Group = mongoose.model<IGroup>('Group', groupSchema);

export default Group;