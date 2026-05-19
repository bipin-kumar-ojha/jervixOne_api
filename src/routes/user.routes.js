import express from "express";
import {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUsers,
  changePassword,
} from "../controllers/user.controller.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.USERS_CREATE),
  createUser
);

router.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.USERS_VIEW),
  getUsers
);

router.get(
  "/:id",
  validateObjectId,
  authMiddleware,
  requirePermission(PERMISSIONS.USERS_VIEW),
  getUserById
);

router.put(
  "/:id",
  validateObjectId,
  authMiddleware,
  requirePermission(PERMISSIONS.USERS_UPDATE),
  updateUser
);

router.delete(
  "/:id",
  validateObjectId,
  authMiddleware,
  requirePermission(PERMISSIONS.USERS_DELETE),
  deleteUser
);

router.put(
  "/:id/password",
  validateObjectId,
  authMiddleware,
  requirePermission(PERMISSIONS.USERS_CHANGE_PASSWORD),
  changePassword
);

export default router;
