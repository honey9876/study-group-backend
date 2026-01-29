/**
 * ====================================
 * APP.TS - EXPRESS APPLICATION SETUP
 * ====================================
 * Configures Express app with middleware,
 * security, and routes
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { ApiResponse } from './utils/apiResponse';
import { ApiError } from './utils/apiError';
import logger from './utils/logger';

// Initialize Express app
const app: Application = express();

/**
 * ====================================
 * SECURITY MIDDLEWARE
 * ====================================
 */

// Helmet - Security headers
if (process.env.ENABLE_HELMET === 'true') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
}

// CORS Configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

if (process.env.ENABLE_CORS === 'true') {
  app.use(cors(corsOptions));
}

// Compression - Compress responses
app.use(compression());

// Trust proxy (for production behind reverse proxy)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

/**
 * ====================================
 * BODY PARSING MIDDLEWARE
 * ====================================
 */

// Parse JSON bodies
app.use(express.json({ 
  limit: '10mb',
  strict: true,
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
}));

// Cookie parser
app.use(cookieParser());

/**
 * ====================================
 * DATA SANITIZATION MIDDLEWARE
 * ====================================
 */

// Sanitize data against NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized request from ${req.ip}: ${key}`);
  },
}));

// Prevent HTTP Parameter Pollution
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit'], // Allow these params to have duplicates
}));

/**
 * ====================================
 * LOGGING MIDDLEWARE
 * ====================================
 */

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${req.ip}`;
    
    if (res.statusCode >= 400) {
      logger.error(logMessage);
    } else {
      logger.http(logMessage);
    }
  });
  
  next();
});

/**
 * ====================================
 * HEALTH CHECK ROUTE
 * ====================================
 */

app.get('/health', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    mongodb: 'Connected', // Will be updated when DB connection is implemented
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };

  return ApiResponse.success(res, healthCheck, 'Health check passed');
});

/**
 * ====================================
 * API WELCOME ROUTE
 * ====================================
 */

app.get('/', (req: Request, res: Response) => {
  return ApiResponse.success(res, {
    message: 'Welcome to Study Group API',
    version: process.env.API_VERSION || 'v1',
    documentation: '/api/docs',
    health: '/health',
  }, 'API is running');
});

/**
 * ====================================
 * API ROUTES (Will be added in later phases)
 * ====================================
 */

// API base path
const API_BASE = `/api/${process.env.API_VERSION || 'v1'}`;

// TODO: Add routes here in Phase 2+
// app.use(`${API_BASE}/auth`, authRoutes);
// app.use(`${API_BASE}/groups`, groupRoutes);
// ... more routes

/**
 * ====================================
 * 404 HANDLER - Route not found
 * ====================================
 */

app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
});

/**
 * ====================================
 * GLOBAL ERROR HANDLER
 * ====================================
 */

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Set default values
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    err.message = `Invalid input data: ${errors.join(', ')}`;
    err.statusCode = 400;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    err.message = `Duplicate value for field: ${field}`;
    err.statusCode = 400;
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    err.message = `Invalid ${err.path}: ${err.value}`;
    err.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.message = 'Invalid token. Please login again';
    err.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    err.message = 'Token expired. Please login again';
    err.statusCode = 401;
  }

  // Send error response
  return res.status(err.statusCode).json({
    success: false,
    statusCode: err.statusCode,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err,
    }),
  });
});

export default app;