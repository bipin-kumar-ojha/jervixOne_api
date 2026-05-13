import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { body, param } from "express-validator";
import { validateRequest } from "../middlewares/validateRequest.js";
import * as projectAssignmentController from "../controllers/projectAssignment.controller.js";

const router = express.Router();

router.post(
	"/:projectId",
	authMiddleware,
	requirePermission("projects.assign"),
	[
		param("projectId").isMongoId().withMessage("Invalid project ID"),
		body("assignType").isIn(["employees", "department"]),
		body("employeeIds").optional().isArray(),
		body("departmentId").optional().isMongoId(),
	],
	validateRequest,
	projectAssignmentController.assignProject
);

export default router;