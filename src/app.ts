/**
 * ====================================
 * EXPRESS APPLICATION SETUP
 * ====================================
 * Main Express application configuration
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { HttpStatus } from './enums/HttpStatus.enum';
import { errorResponse } from './utils/apiResponse';
import logger, { logStream } from './utils/logger';
import { ApiError } from './utils/apiError';

// Import routes
import authRoutes from './routes/auth.routes';
import groupRoutes from './routes/group.routes';
import memberRoutes from './routes/member.routes'; // 👈 NEW - Phase 4
import searchRoutes from './routes/search.routes';

const app: Application = express();

/**
 * Security Middleware
 */
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  })
);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Logging Middleware
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logStream }));
}

/**
 * Health Check Route
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Routes
 */
const API_VERSION = process.env.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/groups`, groupRoutes);
app.use(`/api/${API_VERSION}/groups`, memberRoutes); // 👈 NEW - Phase 4 Member Management
app.use(`/api/${API_VERSION}/search`, searchRoutes);

/**
 * Root Route
 */
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Study Group API',
    version: API_VERSION,
    endpoints: {
      health: '/health',
      auth: `/api/${API_VERSION}/auth`,
      groups: `/api/${API_VERSION}/groups`,
      members: `/api/${API_VERSION}/groups/:groupId/join`, // 👈 Example member endpoint
    },
  });
});

/**
 * 404 Not Found Handler
 */
app.use((req: Request, res: Response) => {
  return errorResponse(
    res,
    `Route ${req.originalUrl} not found`,
    HttpStatus.NOT_FOUND
  );
});

/**
 * Global Error Handler
 */
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return errorResponse(res, err.message, err.statusCode, err.errors);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    return errorResponse(
      res,
      'Validation failed',
      HttpStatus.UNPROCESSABLE_ENTITY,
      errors
    );
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(
      res,
      `${field} already exists`,
      HttpStatus.CONFLICT
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', HttpStatus.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(
      res,
      'Token has expired',
      HttpStatus.UNAUTHORIZED
    );
  }

  // Default error
  return errorResponse(
    res,
    err.message || 'Internal server error',
    err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
  );
});

export default app;