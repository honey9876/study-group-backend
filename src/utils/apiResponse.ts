/**
 * ====================================
 * API RESPONSE UTILITY
 * ====================================
 * Standardized API response format
 */

import { Response } from 'express';
import { HttpStatus } from '../enums/HttpStatus.enum';

/**
 * API Response Interface
 */
interface ApiResponseData {
  success: boolean;
  statusCode: number;
  message: string;
  data?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp?: string;
}

/**
 * Success Response
 */
export const successResponse = (
  res: Response,
  data: any = null,
  message: string = 'Success',
  statusCode: number = HttpStatus.OK,
  meta?: any
): Response => {
  const response: ApiResponseData = {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error Response
 */
export const errorResponse = (
  res: Response,
  message: string = 'Something went wrong',
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  errors?: any
): Response => {
  const response: any = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Paginated Response
 */
export const paginatedResponse = (
  res: Response,
  data: any[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Data retrieved successfully'
): Response => {
  const totalPages = Math.ceil(total / limit);

  return successResponse(res, data, message, HttpStatus.OK, {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  });
};

/**
 * Created Response (201)
 */
export const createdResponse = (
  res: Response,
  data: any,
  message: string = 'Resource created successfully'
): Response => {
  return successResponse(res, data, message, HttpStatus.CREATED);
};

/**
 * No Content Response (204)
 */
export const noContentResponse = (res: Response): Response => {
  return res.status(HttpStatus.NO_CONTENT).send();
};

/**
 * Bad Request Response (400)
 */
export const badRequestResponse = (
  res: Response,
  message: string = 'Bad request',
  errors?: any
): Response => {
  return errorResponse(res, message, HttpStatus.BAD_REQUEST, errors);
};

/**
 * Unauthorized Response (401)
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized access'
): Response => {
  return errorResponse(res, message, HttpStatus.UNAUTHORIZED);
};

/**
 * Forbidden Response (403)
 */
export const forbiddenResponse = (
  res: Response,
  message: string = 'Access forbidden'
): Response => {
  return errorResponse(res, message, HttpStatus.FORBIDDEN);
};

/**
 * Not Found Response (404)
 */
export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return errorResponse(res, message, HttpStatus.NOT_FOUND);
};

/**
 * Conflict Response (409)
 */
export const conflictResponse = (
  res: Response,
  message: string = 'Resource already exists'
): Response => {
  return errorResponse(res, message, HttpStatus.CONFLICT);
};

/**
 * Validation Error Response (422)
 */
export const validationErrorResponse = (
  res: Response,
  errors: any,
  message: string = 'Validation failed'
): Response => {
  return errorResponse(res, message, HttpStatus.UNPROCESSABLE_ENTITY, errors);
};

/**
 * Too Many Requests Response (429)
 */
export const tooManyRequestsResponse = (
  res: Response,
  message: string = 'Too many requests'
): Response => {
  return errorResponse(res, message, HttpStatus.TOO_MANY_REQUESTS);
};

/**
 * Internal Server Error Response (500)
 */
export const internalServerErrorResponse = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return errorResponse(res, message, HttpStatus.INTERNAL_SERVER_ERROR);
};

export default {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  tooManyRequestsResponse,
  internalServerErrorResponse,
};