import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: false, // security + performance
      maxPoolSize: Number.parseInt(process.env.MONGODB_MAX_POOL_SIZE || "10", 10),
      minPoolSize: Number.parseInt(process.env.MONGODB_MIN_POOL_SIZE || "2", 10),
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected');

  } catch (error) {
    console.error('❌ MongoDB connection failed');
    console.error(error.message);
    process.exit(1);
  }
};
