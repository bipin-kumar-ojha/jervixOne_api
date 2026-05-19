import mongoose from 'mongoose';
import { Role } from '../models/role.model.js';
import { PERMISSIONS } from '../constants/permissions.js';
import dotenv from 'dotenv';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const roles = [
  {
    name: 'Super Admin',
    description: 'Full access',
    isSystem: true,
    permissions: []
  },
  {
    name: 'Admin',
    description: 'Manage users and roles',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.ROLES_CREATE,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.DEPARTMENTS_VIEW,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.DESIGNATION_VIEW,
      PERMISSIONS.PROJECTS_VIEW,
      PERMISSIONS.TASK_MANAGEMENT_VIEW,
      PERMISSIONS.TASK_ASSIGNMENTS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.ACTIVITY_LOGS_VIEW
    ]
  },
  {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.DEPARTMENTS_VIEW,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.DESIGNATION_VIEW,
      PERMISSIONS.PROJECTS_VIEW,
      PERMISSIONS.TASK_MANAGEMENT_VIEW,
      PERMISSIONS.TASK_ASSIGNMENTS_VIEW
    ]
  }
];

for (const role of roles) {
  const exists = await Role.findOne({ name: role.name });
  if (!exists) {
    await Role.create(role);
    console.log(`Role created: ${role.name}`);
  }
}

process.exit();
