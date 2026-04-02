import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';

const run = async () => {
  await connectDatabase();

  const user = await User.create({
    name: 'Bipin Kumar',
    email: 'bipin@example.com',
    password: 'test',
    role: 'Admin',
    isActive: true
  });

  process.exit(0);
};

run();
