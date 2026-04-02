import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: false, // security + performance
      serverSelectionTimeoutMS: 5000
    });

    console.log('✅ MongoDB connected');

  } catch (error) {
    console.error('❌ MongoDB connection failed');
    console.error(error.message);
    process.exit(1);
  }
};
