import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { body, param } from "express-validator";
import * as projectController from "../controllers/project.controller.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// Create a new project
router.post(
	"/",
	authMiddleware,
	requirePermission("projects.create"),
	[
		body("projectName").notEmpty().withMessage("Project name is required"),
		body("startDate").isISO8601().withMessage("Valid start date required"),
		body("deliveryDate").isISO8601().withMessage("Valid delivery date required"),
		body("description").notEmpty().withMessage("Description is required"),
		body("budget").isNumeric().withMessage("Budget must be a number"),
		body("status").optional().isIn(["pending", "active", "completed", "on-hold", "cancelled"]),
		body("priority").optional().isIn(["low", "medium", "high", "critical"]),
		body("techStacks").isArray().withMessage("Tech stacks must be an array"),
	],
	validateRequest,
	projectController.createProject
);

// Get all projects
router.get(
	"/",
	authMiddleware,
	requirePermission("projects.view"),
	projectController.getProjects
);

// Get a single project by ID
router.get(
	"/:id",
	authMiddleware,
	requirePermission("projects.view"),
	[param("id").isMongoId().withMessage("Invalid project ID")],
	validateRequest,
	projectController.getProjectById
);

// Update a project by ID
router.put(
	"/:id",
	authMiddleware,
	requirePermission("projects.update"),
	[
		param("id").isMongoId().withMessage("Invalid project ID"),
		body("projectName").optional().notEmpty(),
		body("startDate").optional().isISO8601(),
		body("deliveryDate").optional().isISO8601(),
		body("description").optional().notEmpty(),
		body("budget").optional().isNumeric(),
		body("status").optional().isIn(["pending", "active", "completed", "on-hold", "cancelled"]),
		body("priority").optional().isIn(["low", "medium", "high", "critical"]),
		body("techStacks").optional().isArray(),
	],
	validateRequest,
	projectController.updateProject
);

// Delete a project by ID
router.delete(
	"/:id",
	authMiddleware,
	requirePermission("projects.delete"),
	[param("id").isMongoId().withMessage("Invalid project ID")],
	validateRequest,
	projectController.deleteProject
);

export default router;
