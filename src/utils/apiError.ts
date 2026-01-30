/**
 * ====================================
 * API ERROR UTILITY
 * ====================================
 * Custom error classes for different error types
 */

import { HttpStatus } from '../enums/HttpStatus.enum';

/**
 * Base API Error Class
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any;

  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = true,
    errors?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', errors?: any) {
    super(HttpStatus.BAD_REQUEST, message, true, errors);
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized access') {
    super(HttpStatus.UNAUTHORIZED, message, true);
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access forbidden') {
    super(HttpStatus.FORBIDDEN, message, true);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(HttpStatus.NOT_FOUND, message, true);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource already exists') {
    super(HttpStatus.CONFLICT, message, true);
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', errors?: any) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, message, true, errors);
  }
}

/**
 * Too Many Requests Error (429)
 */
export class TooManyRequestsError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(HttpStatus.TOO_MANY_REQUESTS, message, true);
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(HttpStatus.INTERNAL_SERVER_ERROR, message, false);
  }
}

export default {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
};