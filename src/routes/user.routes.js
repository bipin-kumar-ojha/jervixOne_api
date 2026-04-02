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

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requirePermission("users:create"),
  createUser
);

router.get(
  "/",
  authMiddleware,
  requirePermission("users:view"),
  getUsers
);

router.get(
  "/:id",
  validateObjectId,
  authMiddleware,
  requirePermission("users:view"),
  getUserById
);

router.put(
  "/:id",
  validateObjectId,
  authMiddleware,
  requirePermission("users:update"),
  updateUser
);

router.delete(
  "/:id",
  validateObjectId,
  authMiddleware,
  requirePermission("users:delete"),
  deleteUser
);

router.put(
  "/:id/password",
  validateObjectId,
  authMiddleware,
  requirePermission("users:changePassword"),
  changePassword
);

export default router;