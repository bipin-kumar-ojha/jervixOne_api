import express from "express";
import {
  createEmployee,
  getEmployees,
  deleteEmployee,
  updateEmployee,
  getEmployeeById,
} from "../controllers/employee.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  upload.single("profileImage"),
  createEmployee
);

router.put(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upload.single("profileImage"),
  updateEmployee
);

router.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.EMPLOYEE_VIEW),
  getEmployees
);

router.get(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.EMPLOYEE_VIEW),
  getEmployeeById
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteEmployee
);

export default router;
