/**
 * ====================================
 * ASYNC HANDLER UTILITY
 * ====================================
 * Wrapper for async route handlers to catch errors
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async Handler Wrapper
 * Eliminates the need for try-catch in every controller
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;