import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Role } from '../models/role.model.js';
import { User } from '../models/user.model.js';

// 🔹 1. Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);


// 🔹 2. Check if Super Admin role exists
const role = await Role.findOne({ isSystem: true });

if (!role) {

  const superAdminRole = await Role.create({
    name: 'Super Admin',
    description: 'System owner with full access',
    permissions: [],
    isSystem: true
  });

  await User.create({
    name: 'System Owner',
    email: 'admin@jervix.com',
    password: 'Jervix@123',
    role: superAdminRole._id
  });

} else {
}

// 🔹 3. Exit cleanly
await mongoose.disconnect();
process.exit(0);