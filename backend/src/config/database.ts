import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDatabase(uri?: string): Promise<void> {
  const mongoUri = uri ?? process.env.MONGODB_URI ?? '';

  mongoose.connection.on('connected', () => {
    logger.info({ env: process.env.NODE_ENV }, 'MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err: Error) => {
    logger.error({ err }, 'MongoDB error');
  });

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    bufferCommands: process.env.NODE_ENV !== 'production',
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
