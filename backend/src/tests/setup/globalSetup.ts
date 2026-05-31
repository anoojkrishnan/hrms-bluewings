import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export default async function globalSetup(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-at-least-32-chars';
  process.env.ENCRYPTION_KEY = '0'.repeat(64);
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  (global as Record<string, unknown>).__MONGOD__ = mongod;
}
