import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { createDepartment, deleteDepartment, getDepartments } from "../controllers/department.controller.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requirePermission("departments.create"),
  createDepartment
);

router.get(
  "/",
  authMiddleware,
  requirePermission("departments.view"),
  getDepartments
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission("departments.delete"),
  deleteDepartment
);

export default router;