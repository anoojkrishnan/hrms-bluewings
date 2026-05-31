import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '@/config/database';

export async function setupTestDb(): Promise<void> {
  await connectDatabase(process.env.MONGODB_URI);
}

export async function teardownTestDb(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
}

export async function clearCollection(name: string): Promise<void> {
  const collections = mongoose.connection.collections;
  if (collections[name]) {
    await collections[name].deleteMany({});
  }
}

export async function clearAllCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
