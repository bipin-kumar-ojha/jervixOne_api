import express from "express";
import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  updateRole,
} from "../controllers/role.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission, requireRole } from "../middlewares/rbac.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, requirePermission("roles.create"), createRole);

router.get("/", authMiddleware, requirePermission("roles.view"), getRoles);
console.log("Defined GET / route for fetching all roles");
router.get("/:id", authMiddleware, requirePermission("roles.view"), getRoleById);
console.log("Defined GET /:id route for fetching role by ID");


router.put("/:id", authMiddleware, requirePermission("roles.update"), updateRole);

router.delete("/:id", authMiddleware, requirePermission("roles.delete"), deleteRole);

export default router;
