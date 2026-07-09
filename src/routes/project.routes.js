import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { body, param } from "express-validator";
import * as projectController from "../controllers/project.controller.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();
const allowedCurrencies = ["INR", "USD"];
const allowedProjectStatuses = ["planning", "pending", "active", "completed", "on-hold", "cancelled"];
const validateBudget = (value) => {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		throw new Error("Budget must be a number greater than or equal to 0");
	}
	return true;
};
const createProjectValidators = [
	body("projectName").notEmpty().withMessage("Project name is required"),
	body("startDate").isISO8601().withMessage("Valid start date required"),
	body("deliveryDate").isISO8601().withMessage("Valid delivery date required"),
	body("description").notEmpty().withMessage("Description is required"),
	body("budget").custom(validateBudget),
	body("currency").optional().isIn(allowedCurrencies).withMessage("Currency must be one of INR or USD"),
	body("status").optional().isIn(allowedProjectStatuses),
	body("priority").optional().isIn(["low", "medium", "high", "critical"]),
	body("techStacks").isArray().withMessage("Tech stacks must be an array"),
];
const updateProjectValidators = [
	param("id").isMongoId().withMessage("Invalid project ID"),
	body("projectName").optional().notEmpty(),
	body("startDate").optional().isISO8601(),
	body("deliveryDate").optional().isISO8601(),
	body("description").optional().notEmpty(),
	body("budget").optional().custom(validateBudget),
	body("currency").optional().isIn(allowedCurrencies).withMessage("Currency must be one of INR or USD"),
	body("status").optional().isIn(allowedProjectStatuses),
	body("priority").optional().isIn(["low", "medium", "high", "critical"]),
	body("techStacks").optional().isArray(),
];

// Create a new project
router.post(
	"/",
	authMiddleware,
	requirePermission(PERMISSIONS.PROJECTS_CREATE),
	createProjectValidators,
	validateRequest,
	projectController.createProject
);

// Get all projects
router.get(
	"/",
	authMiddleware,
	requirePermission(PERMISSIONS.PROJECTS_VIEW),
	projectController.getProjects
);

// Get project task analytics and timing summary
router.get(
	"/:projectId/task-summary",
	authMiddleware,
	requirePermission(PERMISSIONS.PROJECTS_VIEW),
	[param("projectId").isMongoId().withMessage("Invalid project ID")],
	validateRequest,
	projectController.getProjectTaskSummary
);

// Get a single project by ID
router.get(
	"/:id",
	authMiddleware,
	requirePermission(PERMISSIONS.PROJECTS_VIEW),
	[param("id").isMongoId().withMessage("Invalid project ID")],
	validateRequest,
	projectController.getProjectById
);

// Update a project by ID
router.put(
	"/:id",
	authMiddleware,
	requirePermission(PERMISSIONS.PROJECTS_UPDATE),
	updateProjectValidators,
	validateRequest,
	projectController.updateProject
);

// Delete a project by ID
router.delete(
	"/:id",
	authMiddleware,
	requirePermission(PERMISSIONS.PROJECTS_DELETE),
	[param("id").isMongoId().withMessage("Invalid project ID")],
	validateRequest,
	projectController.deleteProject
);

export default router;
export { allowedCurrencies, allowedProjectStatuses, createProjectValidators, updateProjectValidators, validateBudget };
