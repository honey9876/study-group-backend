/**
 * ====================================
 * SERVER.TS - APPLICATION ENTRY POINT
 * ====================================
 * Main server file that initializes the application
 * and starts listening on the specified port
 */

import dotenv from 'dotenv';
import { Server } from 'http';
import app from './app';
import { connectDB } from './config/db.config';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Server configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Store server instance
let server: Server;

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start Express server
    server = app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info(`🚀 Server is running in ${NODE_ENV.toUpperCase()} mode`);
      logger.info(`📡 Server listening on port ${PORT}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api/v1`);
      logger.info(`📊 Health Check: http://localhost:${PORT}/health`);
      logger.info('='.repeat(50));
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
      } else {
        logger.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`\n⚠️  ${signal} signal received: Closing server gracefully`);
  
  if (server) {
    server.close(async () => {
      logger.info('✅ HTTP server closed');
      
      try {
        // Close database connections
        const mongoose = require('mongoose');
        await mongoose.connection.close(false);
        logger.info('✅ MongoDB connection closed');
        
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle process termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('❌ UNCAUGHT EXCEPTION! Shutting down...', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('❌ UNHANDLED REJECTION! Shutting down...', reason);
  process.exit(1);
});

// Start the server
startServer();

export default server;