import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getAllPermissions } from '../controllers/permission.controller.js';

const router = express.Router();

router.get(
  '/permissions',
  authMiddleware,
  getAllPermissions
);

export default router;