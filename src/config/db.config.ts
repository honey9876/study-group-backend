/**
 * ====================================
 * DATABASE CONFIGURATION
 * ====================================
 * MongoDB connection setup with Mongoose
 */

import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * MongoDB connection options
 */
const mongooseOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4, // Use IPv4
};

/**
 * Connect to MongoDB database
 */
export const connectDB = async (): Promise<void> => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error('❌ MONGODB_URI is not defined in environment variables');
    }

    // Connect to MongoDB
    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);

    logger.info('='.repeat(50));
    logger.info('✅ MongoDB Connected Successfully');
    logger.info(`📦 Database: ${conn.connection.name}`);
    logger.info(`🌐 Host: ${conn.connection.host}`);
    logger.info(`🔌 Port: ${conn.connection.port}`);
    logger.info('='.repeat(50));

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('✅ Mongoose connected to DB');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('❌ Mongoose connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  Mongoose disconnected from DB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('✅ Mongoose connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ MongoDB Connection Failed:', error);
    process.exit(1);
  }
};

/**
 * Close database connection
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('✅ MongoDB connection closed');
  } catch (error) {
    logger.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Check database connection status
 */
export const isDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export default { connectDB, disconnectDB, isDBConnected };