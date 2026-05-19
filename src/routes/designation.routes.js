import express from "express";
import {
  createDesignation,
  getDesignations,
  deleteDesignation,
  getDesignationMeta,
} from "../controllers/designation.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.DESIGNATION_CREATE),
  createDesignation
);

router.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.DESIGNATION_VIEW),
  getDesignations
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.DESIGNATION_DELETE),
  deleteDesignation
);

router.get("/meta", authMiddleware, requirePermission(PERMISSIONS.DESIGNATION_VIEW), getDesignationMeta);

export default router;
