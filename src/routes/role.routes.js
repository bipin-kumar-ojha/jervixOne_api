import express from "express";
import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  updateRole,
} from "../controllers/role.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

router.post("/", authMiddleware, requirePermission(PERMISSIONS.ROLES_CREATE), createRole);

router.get("/", authMiddleware, requirePermission(PERMISSIONS.ROLES_VIEW), getRoles);
router.get("/:id", authMiddleware, requirePermission(PERMISSIONS.ROLES_VIEW), getRoleById);


router.put("/:id", authMiddleware, requirePermission(PERMISSIONS.ROLES_UPDATE), updateRole);

router.delete("/:id", authMiddleware, requirePermission(PERMISSIONS.ROLES_DELETE), deleteRole);

export default router;
