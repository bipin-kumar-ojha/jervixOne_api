import express from "express";
import { body, param, query } from "express-validator";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import * as taskController from "../controllers/task.controller.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

const taskIdParamValidation = [
	param("id").isMongoId().withMessage("Invalid task ID"),
];

const taskListValidation = [
	query("projectId").optional().isMongoId().withMessage("Invalid project ID"),
	query("assignedTo").optional().isMongoId().withMessage("Invalid employee ID"),
	query("status")
		.optional()
		.isIn(["assigned", "in-progress", "paused", "completed", "blocked"])
		.withMessage("Invalid task status"),
	query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive number"),
	query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
	query("sortBy")
		.optional()
		.isIn(["createdAt", "dueDate", "priority", "status"])
		.withMessage("Invalid sort field"),
	query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("Invalid sort order"),
];

const createTaskValidation = [
	body("projectId").isMongoId().withMessage("Valid project ID is required"),
	body("assignedTo").isMongoId().withMessage("Valid employee ID is required"),
	body("title").trim().notEmpty().withMessage("Task title is required"),
	body("description").optional().isString(),
	body("priority").optional().isIn(["low", "medium", "high"]).withMessage("Invalid priority"),
	body("estimatedHours")
		.optional({ nullable: true, checkFalsy: true })
		.isFloat({ min: 1, max: 500 })
		.withMessage("Estimated hours must be between 1 and 500"),
	body("dueDate").isISO8601().withMessage("Valid due date is required"),
];

const updateTaskValidation = [
	...taskIdParamValidation,
	body("projectId").optional().isMongoId().withMessage("Invalid project ID"),
	body("assignedTo").optional().isMongoId().withMessage("Invalid employee ID"),
	body("title").optional().trim().notEmpty().withMessage("Task title cannot be empty"),
	body("description").optional().isString(),
	body("priority").optional().isIn(["low", "medium", "high"]).withMessage("Invalid priority"),
	body("estimatedHours")
		.optional({ nullable: true, checkFalsy: true })
		.isFloat({ min: 1, max: 500 })
		.withMessage("Estimated hours must be between 1 and 500"),
	body("actualHours")
		.optional({ nullable: true, checkFalsy: true })
		.isFloat({ min: 0 })
		.withMessage("Actual hours must be a non-negative number"),
	body("dueDate").optional().isISO8601().withMessage("Invalid due date"),
	body("status")
		.optional()
		.isIn(["assigned", "in-progress", "paused", "completed", "blocked"])
		.withMessage("Invalid task status"),
];

const completeTaskValidation = [
	...taskIdParamValidation,
	body("actualHours")
		.optional({ nullable: true, checkFalsy: true })
		.isFloat({ min: 0 })
		.withMessage("Actual hours must be a non-negative number"),
];

router.post(
	"/",
	authMiddleware,
	requirePermission(PERMISSIONS.TASK_ASSIGNMENTS_CREATE),
	createTaskValidation,
	validateRequest,
	taskController.createTask,
);

router.get(
	"/",
	authMiddleware,
	requirePermission(PERMISSIONS.TASK_MANAGEMENT_VIEW),
	taskListValidation,
	validateRequest,
	taskController.getTasks,
);

router.get(
	"/my",
	authMiddleware,
	taskListValidation,
	validateRequest,
	taskController.getMyTasks,
);

router.get(
	"/:id",
	authMiddleware,
	requirePermission(PERMISSIONS.TASK_MANAGEMENT_VIEW),
	taskIdParamValidation,
	validateRequest,
	taskController.getTaskById,
);

router.put(
	"/:id",
	authMiddleware,
	updateTaskValidation,
	validateRequest,
	taskController.updateTask,
);

router.delete(
	"/:id",
	authMiddleware,
	requirePermission(PERMISSIONS.TASK_ASSIGNMENTS_DELETE),
	taskIdParamValidation,
	validateRequest,
	taskController.deleteTask,
);

router.patch(
	"/:id/start",
	authMiddleware,
	requirePermission(PERMISSIONS.TASK_MANAGEMENT_UPDATE),
	taskIdParamValidation,
	validateRequest,
	taskController.startTask,
);

router.patch(
	"/:id/pause",
	authMiddleware,
	requirePermission(PERMISSIONS.TASK_MANAGEMENT_UPDATE),
	taskIdParamValidation,
	validateRequest,
	taskController.pauseTask,
);

router.patch(
	"/:id/resume",
	authMiddleware,
	requirePermission(PERMISSIONS.TASK_MANAGEMENT_UPDATE),
	taskIdParamValidation,
	validateRequest,
	taskController.resumeTask,
);

router.patch(
	"/:id/complete",
	authMiddleware,
	requirePermission(PERMISSIONS.TASK_MANAGEMENT_UPDATE),
	completeTaskValidation,
	validateRequest,
	taskController.completeTask,
);

export default router;
