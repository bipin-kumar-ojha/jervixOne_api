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

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requirePermission("employee.create"),
  upload.single("profileImage"),
  createEmployee
);

router.put(
  "/:id",
  authMiddleware,
  upload.single("profileImage"),
  updateEmployee
);

router.get(
  "/",
  authMiddleware,
  requirePermission("employee.view"),
  getEmployees
);

router.get(
  "/:id",
  authMiddleware,
  requirePermission("employee.view"),
  getEmployeeById
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission("employee.delete"),
  deleteEmployee
);

export default router;