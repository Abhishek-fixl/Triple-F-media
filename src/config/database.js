import mongoose from 'mongoose';

import logger from '../utils/logger.js';

const connectDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (
    process.env.MONGODB_URI.includes('username:password') ||
    process.env.MONGODB_URI.includes('cluster.mongodb.net/triplef')
  ) {
    throw new Error(
      'MONGODB_URI is still using the sample placeholder. Update .env with your real MongoDB connection string.',
    );
  }

  mongoose.set('strictQuery', true);
  mongoose.connection.on('connecting', () => {
    logger.info('MongoDB connection attempt started');
    console.log('Connecting to MongoDB...');
  });
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
    console.log('MongoDB connected.');
  });
  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', { error: error.message });
    console.error('MongoDB connection error:', error.message);
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 20000,
  });

  logger.info('MongoDB connected', { host: connection.connection.host });
  return connection;
};

export default connectDatabase;
