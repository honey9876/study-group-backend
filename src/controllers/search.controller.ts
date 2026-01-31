/**
 * ====================================
 * SEARCH CONTROLLER
 * ====================================
 * Handle all group search and filter operations
 */

import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { successResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import Group from '../models/Group.model';
import { ApiError } from '../utils/apiError';
import { HttpStatus } from '../enums/HttpStatus.enum';
import {
  calculatePagination,
  generatePaginationMeta,
  validatePagination,
} from '../utils/pagination';
import {
  buildCombinedFilter,
  getSortObject,
  isValidSortOption,
} from '../utils/sortFilter';

/**
 * @desc    Search groups with filters
 * @route   GET /api/search/groups
 * @access  Public
 */
export const searchGroups = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      search,
      category,
      visibility,
      tags,
      hasSpace,
      minHours,
      maxHours,
      sort,
      page,
      limit,
    } = req.query;

    // Validate pagination
    if (!validatePagination({ page: page as any, limit: limit as any })) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'Invalid pagination parameters'
      );
    }

    // Validate sort option
    if (!isValidSortOption(sort as string)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Invalid sort option');
    }

    // Calculate pagination
    const { page: currentPage, limit: pageLimit, skip } = calculatePagination({
      page: Number(page),
      limit: Number(limit),
    });

    // Build filter query
    const filter = buildCombinedFilter({
      search: search as string,
      category: category as string,
      visibility: visibility as string,
      tags: tags as string | string[],
      hasSpace: hasSpace === 'true',
      minHours: minHours ? Number(minHours) : undefined,
      maxHours: maxHours ? Number(maxHours) : undefined,
      isActive: true,
    });

    // Get sort object
    const sortObject = getSortObject(sort as string);

    // Execute query with pagination
    const [groups, totalCount] = await Promise.all([
      Group.find(filter)
        .populate('leader', 'name email avatar')
        .sort(sortObject)
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Group.countDocuments(filter),
    ]);

    // Generate pagination metadata
    const pagination = generatePaginationMeta(
      currentPage,
      pageLimit,
      totalCount
    );

    successResponse(
      res,
      groups,
      'Groups retrieved successfully',
      HttpStatus.OK,
      { pagination }
    );
  }
);

/**
 * @desc    Get popular groups
 * @route   GET /api/search/groups/popular
 * @access  Public
 */
export const getPopularGroups = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { limit } = req.query;
    const pageLimit = Math.min(Number(limit) || 10, 50);

    const groups = await Group.find({
      isActive: true,
      visibility: 'public',
    })
      .populate('leader', 'name email avatar')
      .sort({ currentMemberCount: -1, createdAt: -1 })
      .limit(pageLimit)
      .lean();

    successResponse(
      res,
      groups,
      'Popular groups retrieved successfully',
      HttpStatus.OK,
      { total: groups.length }
    );
  }
);

/**
 * @desc    Get trending groups (recently active)
 * @route   GET /api/search/groups/trending
 * @access  Public
 */
export const getTrendingGroups = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { limit } = req.query;
    const pageLimit = Math.min(Number(limit) || 10, 50);

    // Groups updated in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups = await Group.find({
      isActive: true,
      visibility: 'public',
      updatedAt: { $gte: sevenDaysAgo },
    })
      .populate('leader', 'name email avatar')
      .sort({ updatedAt: -1, currentMemberCount: -1 })
      .limit(pageLimit)
      .lean();

    successResponse(
      res,
      groups,
      'Trending groups retrieved successfully',
      HttpStatus.OK,
      { total: groups.length }
    );
  }
);

/**
 * @desc    Get recommended groups (based on category)
 * @route   GET /api/search/groups/recommended
 * @access  Private (optional - better with auth)
 */
export const getRecommendedGroups = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { category, limit } = req.query;
    const pageLimit = Math.min(Number(limit) || 10, 50);

    const filter: any = {
      isActive: true,
      visibility: 'public',
    };

    if (category) {
      filter.category = category;
    }

    const groups = await Group.find(filter)
      .populate('leader', 'name email avatar')
      .sort({ currentMemberCount: -1, createdAt: -1 })
      .limit(pageLimit)
      .lean();

    successResponse(
      res,
      groups,
      'Recommended groups retrieved successfully',
      HttpStatus.OK,
      { total: groups.length }
    );
  }
);

/**
 * @desc    Get groups by category
 * @route   GET /api/search/groups/category/:category
 * @access  Public
 */
export const getGroupsByCategory = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { category } = req.params;
    const { page, limit, sort } = req.query;

    // Validate category
    if (!category) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Category is required');
    }

    // Validate pagination
    if (!validatePagination({ page: page as any, limit: limit as any })) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'Invalid pagination parameters'
      );
    }

    // Calculate pagination
    const { page: currentPage, limit: pageLimit, skip } = calculatePagination({
      page: Number(page),
      limit: Number(limit),
    });

    // Get sort object
    const sortObject = getSortObject(sort as string);

    const upperCategory = category.toUpperCase();

    // Execute query
    const [groups, totalCount] = await Promise.all([
      Group.find({
        category: upperCategory,
        isActive: true,
      })
        .populate('leader', 'name email avatar')
        .sort(sortObject)
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Group.countDocuments({
        category: upperCategory,
        isActive: true,
      }),
    ]);

    // Generate pagination metadata
    const pagination = generatePaginationMeta(
      currentPage,
      pageLimit,
      totalCount
    );

    successResponse(
      res,
      groups,
      `${upperCategory} groups retrieved successfully`,
      HttpStatus.OK,
      { pagination }
    );
  }
);

/**
 * @desc    Get available groups (with space)
 * @route   GET /api/search/groups/available
 * @access  Public
 */
export const getAvailableGroups = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, limit } = req.query;

    // Validate pagination
    if (!validatePagination({ page: page as any, limit: limit as any })) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'Invalid pagination parameters'
      );
    }

    // Calculate pagination
    const { page: currentPage, limit: pageLimit, skip } = calculatePagination({
      page: Number(page),
      limit: Number(limit),
    });

    // Find groups with available space
    const [groups, totalCount] = await Promise.all([
      Group.find({
        isActive: true,
        visibility: 'public',
        $expr: {
          $lt: ['$currentMemberCount', '$capacity'],
        },
      })
        .populate('leader', 'name email avatar')
        .sort({ currentMemberCount: 1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Group.countDocuments({
        isActive: true,
        visibility: 'public',
        $expr: {
          $lt: ['$currentMemberCount', '$capacity'],
        },
      }),
    ]);

    // Generate pagination metadata
    const pagination = generatePaginationMeta(
      currentPage,
      pageLimit,
      totalCount
    );

    successResponse(
      res,
      groups,
      'Available groups retrieved successfully',
      HttpStatus.OK,
      { pagination }
    );
  }
);

/**
 * @desc    Search groups by tag
 * @route   GET /api/search/groups/tags
 * @access  Public
 */
export const searchGroupsByTags = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { tags, page, limit } = req.query;

    if (!tags) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Tags parameter is required');
    }

    // Validate pagination
    if (!validatePagination({ page: page as any, limit: limit as any })) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'Invalid pagination parameters'
      );
    }

    // Calculate pagination
    const { page: currentPage, limit: pageLimit, skip } = calculatePagination({
      page: Number(page),
      limit: Number(limit),
    });

    // Parse tags
    const tagArray = Array.isArray(tags) ? tags : [tags];

    // Execute query
    const [groups, totalCount] = await Promise.all([
      Group.find({
        isActive: true,
        tags: {
          $in: tagArray.map((tag) => new RegExp(tag as string, 'i')),
        },
      })
        .populate('leader', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Group.countDocuments({
        isActive: true,
        tags: {
          $in: tagArray.map((tag) => new RegExp(tag as string, 'i')),
        },
      }),
    ]);

    // Generate pagination metadata
    const pagination = generatePaginationMeta(
      currentPage,
      pageLimit,
      totalCount
    );

    successResponse(
      res,
      groups,
      'Groups retrieved successfully',
      HttpStatus.OK,
      { pagination }
    );
  }
);

export default {
  searchGroups,
  getPopularGroups,
  getTrendingGroups,
  getRecommendedGroups,
  getGroupsByCategory,
  getAvailableGroups,
  searchGroupsByTags,
};