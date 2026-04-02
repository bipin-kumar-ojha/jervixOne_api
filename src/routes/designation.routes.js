import express from "express";
import {
  createDesignation,
  getDesignations,
  deleteDesignation,
} from "../controllers/designation.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requirePermission("designations.create"),
  createDesignation
);

router.get(
  "/",
  authMiddleware,
  requirePermission("designations.view"),
  getDesignations
);

router.delete(
  "/:id",
  authMiddleware,
  requirePermission("designations.delete"),
  deleteDesignation
);

export default router;