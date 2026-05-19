import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { getAllPermissions } from '../controllers/permission.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

router.get('/', authMiddleware, requirePermission(PERMISSIONS.ROLES_VIEW), getAllPermissions);

export default router;
