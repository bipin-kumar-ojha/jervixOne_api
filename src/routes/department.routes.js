import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { createDepartment, deleteDepartment, getDepartments } from "../controllers/department.controller.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.DEPARTMENTS_CREATE),
  createDepartment
);

router.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.DEPARTMENTS_VIEW),
  getDepartments
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.DEPARTMENTS_DELETE),
  deleteDepartment
);

export default router;
