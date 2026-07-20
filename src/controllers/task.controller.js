import mongoose from "mongoose";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import { Employee } from "../models/employee.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const TASK_STATUSES = ["assigned", "in-progress", "paused", "completed", "blocked"];
const TASK_PRIORITIES = ["low", "medium", "high"];
const MAX_ESTIMATED_HOURS = 500;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const STATUS_TRANSITIONS = {
	assigned: ["in-progress"],
	"in-progress": ["paused", "completed"],
	paused: ["in-progress", "completed"],
	blocked: ["in-progress"],
	completed: [],
};

const TASK_POPULATE = [
	{ path: "projectId", select: "projectName status priority" },
	{ path: "assignedTo", select: "name officialEmail personalEmail employeeId" },
	{ path: "assignedBy", select: "name email" },
];

const taskTimeLogSchema = new mongoose.Schema({
	taskId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Task",
		required: true,
		index: true,
	},
	employeeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Employee",
		required: true,
		index: true,
	},
	projectId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Project",
		required: true,
		index: true,
	},
	organizationId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Organization",
		required: true,
		index: true,
	},
	startedAt: {
		type: Date,
		required: true,
	},
	endedAt: {
		type: Date,
		default: null,
	},
	durationMinutes: {
		type: Number,
		default: 0,
		min: 0,
	},
}, {
	timestamps: true,
});

taskTimeLogSchema.index(
	{ taskId: 1, employeeId: 1, organizationId: 1, endedAt: 1 },
);

const TaskTimeLog = mongoose.models.TaskTimeLog
	|| mongoose.model("TaskTimeLog", taskTimeLogSchema);

const normalizeRoleName = (roleName = "") => String(roleName).trim().toLowerCase();

const isPrivilegedUser = (user) => {
	const roleName = normalizeRoleName(user?.role?.name);
	return Boolean(
		user?.role?.isSystem
		|| roleName === "super admin"
		|| roleName === "admin"
		|| roleName === "manager",
	);
};

const ensureOrganization = (req) => {
	const organizationId = req.user?.organizationId;

	if (!organizationId) {
		throw new ApiError(400, "No organization linked to your account");
	}

	return organizationId;
};

const ensureObjectId = (value, fieldName) => {
	if (!mongoose.Types.ObjectId.isValid(value)) {
		throw new ApiError(400, `Invalid ${fieldName}`);
	}
};

const toObjectIdString = (value) => value?._id?.toString?.() || value?.toString?.();

const toISODateOnly = (value) => {
	if (!value) {
		return value;
	}

	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toISOString().slice(0, 10);
};

const roundHours = (minutes) => Number((minutes / 60).toFixed(2));

const calculateDurationMinutes = (startedAt, endedAt = new Date()) => {
	const startDate = startedAt instanceof Date ? startedAt : new Date(startedAt);
	const endDate = endedAt instanceof Date ? endedAt : new Date(endedAt);

	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return 0;
	}

	return Math.max(Math.round((endDate.getTime() - startDate.getTime()) / 60000), 0);
};

const getTaskIdString = (task) => toObjectIdString(task?._id);

export const getTimingSummaries = async (tasks) => {
	const taskList = Array.isArray(tasks) ? tasks : [tasks];
	const taskIds = taskList
		.map((task) => task?._id)
		.filter(Boolean);

	if (!taskIds.length) {
		return new Map();
	}

	const logs = await TaskTimeLog.find({ taskId: { $in: taskIds } })
		.select("taskId startedAt endedAt durationMinutes")
		.lean();
	const now = new Date();
	const summaries = new Map();

	for (const task of taskList) {
		const estimatedMinutes = Math.round(Number(task?.estimatedHours || 0) * 60);
		summaries.set(getTaskIdString(task), {
			estimatedMinutes,
			usedMinutes: 0,
			remainingMinutes: estimatedMinutes,
			actualHours: 0,
			isTimerRunning: false,
			activeTimerStartedAt: null,
			status: task?.status,
		});
	}

	for (const log of logs) {
		const taskId = toObjectIdString(log.taskId);
		const summary = summaries.get(taskId);

		if (!summary) {
			continue;
		}

		if (log.endedAt) {
			const durationMinutes = log.durationMinutes ?? calculateDurationMinutes(log.startedAt, log.endedAt);
			summary.usedMinutes += Number(durationMinutes || 0);
			continue;
		}

		if (summary.status === "in-progress" && (
			!summary.activeTimerStartedAt
			|| new Date(log.startedAt) > new Date(summary.activeTimerStartedAt)
		)) {
			summary.activeTimerStartedAt = log.startedAt;
		}
	}

	for (const summary of summaries.values()) {
		if (summary.activeTimerStartedAt) {
			summary.isTimerRunning = true;
			summary.usedMinutes += calculateDurationMinutes(summary.activeTimerStartedAt, now);
		}

		summary.remainingMinutes = Math.max(summary.estimatedMinutes - summary.usedMinutes, 0);
		summary.actualHours = roundHours(summary.usedMinutes);
		delete summary.status;
	}

	return summaries;
};

const serializeTask = (task, timingSummary) => {
	const serializedTask = typeof task?.toObject === "function"
		? task.toObject()
		: { ...task };
	const timing = timingSummary || {
		estimatedMinutes: Math.round(Number(serializedTask.estimatedHours || 0) * 60),
		usedMinutes: 0,
		remainingMinutes: Math.round(Number(serializedTask.estimatedHours || 0) * 60),
		actualHours: Number(serializedTask.actualHours || 0),
		isTimerRunning: false,
		activeTimerStartedAt: null,
	};

	return {
		...serializedTask,
		actualHours: timing.actualHours,
		dueDate: toISODateOnly(serializedTask.dueDate),
		timing,
	};
};

const serializeTasks = async (tasks) => {
	const timingSummaries = await getTimingSummaries(tasks);
	return tasks.map((task) => serializeTask(task, timingSummaries.get(getTaskIdString(task))));
};

const serializeTaskWithTiming = async (task) => {
	const timingSummaries = await getTimingSummaries([task]);
	return serializeTask(task, timingSummaries.get(getTaskIdString(task)));
};

const parsePositiveNumber = (value, fieldName, { required = false, max = null } = {}) => {
	if (value === undefined || value === null || value === "") {
		if (required) {
			throw new ApiError(400, `${fieldName} is required`);
		}

		return null;
	}

	const numberValue = Number(value);

	if (!Number.isFinite(numberValue) || numberValue <= 0) {
		throw new ApiError(400, `${fieldName} must be a positive number`);
	}

	if (max && numberValue > max) {
		throw new ApiError(400, `${fieldName} cannot exceed ${max}`);
	}

	return numberValue;
};

const parseDueDate = (value, { allowPast = false } = {}) => {
	if (!value) {
		throw new ApiError(400, "Due date is required");
	}

	const dueDate = new Date(value);

	if (Number.isNaN(dueDate.getTime())) {
		throw new ApiError(400, "Invalid due date");
	}

	if (!allowPast) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (dueDate < today) {
			throw new ApiError(400, "Due date cannot be in the past");
		}
	}

	return dueDate;
};

const generateTaskCode = () => {
	const timestamp = Date.now().toString(36).toUpperCase();
	const random = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `TASK-${timestamp}-${random}`;
};

const generateUniqueTaskCode = async () => {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const taskCode = generateTaskCode();
		const exists = await Task.exists({ taskCode });

		if (!exists) {
			return taskCode;
		}
	}

	throw new ApiError(500, "Unable to generate unique task code");
};

const getEmployeesForUser = async (user, organizationId) => {
	const employees = await Employee.find({
		organizationId,
		$or: [
			{ officialEmail: user.email },
			{ personalEmail: user.email },
		],
	}).select("_id name officialEmail personalEmail").lean();

	if (!employees.length) {
		throw new ApiError(403, "Employee profile not found for this user");
	}

	return employees;
};

const getEmployeeIdsForUser = async (user, organizationId) => {
	const employees = await getEmployeesForUser(user, organizationId);
	return employees.map((employee) => employee._id);
};

const ensureCanManageTask = async (req, task, action = "manage") => {
	if (isPrivilegedUser(req.user)) {
		return null;
	}

	const employees = await getEmployeesForUser(req.user, task.organizationId);
	const taskOwnerId = toObjectIdString(task.assignedTo);
	const ownsTask = employees.some((employee) => taskOwnerId === employee._id.toString());

	if (!ownsTask) {
		throw new ApiError(403, `You can only ${action} your own task`);
	}

	return employees;
};

const ensureAssignedEmployeeCanAct = async (req, task, action) => {
	const employees = await getEmployeesForUser(req.user, task.organizationId);
	const taskOwnerId = toObjectIdString(task.assignedTo);
	const isAssignedEmployee = employees.some((employee) => taskOwnerId === employee._id.toString());

	if (!isAssignedEmployee) {
		throw new ApiError(403, `Only the assigned employee can ${action} this task`);
	}

	return employees;
};

const ensureStatusTransition = (currentStatus, nextStatus) => {
	if (!TASK_STATUSES.includes(nextStatus)) {
		throw new ApiError(400, "Invalid task status");
	}

	if (currentStatus === "completed") {
		throw new ApiError(400, "Completed tasks cannot be modified");
	}

	if (currentStatus === nextStatus) {
		throw new ApiError(400, `Task is already ${nextStatus}`);
	}

	const allowedStatuses = STATUS_TRANSITIONS[currentStatus] || [];

	if (!allowedStatuses.includes(nextStatus)) {
		throw new ApiError(400, `Cannot move task from ${currentStatus} to ${nextStatus}`);
	}
};

const ensureCurrentStatus = (currentStatus, allowedStatuses, action) => {
	if (!allowedStatuses.includes(currentStatus)) {
		throw new ApiError(400, `Task cannot be ${action} from ${currentStatus} status`);
	}
};

const validateProjectAndEmployee = async ({ projectId, assignedTo, organizationId }) => {
	ensureObjectId(projectId, "project ID");
	ensureObjectId(assignedTo, "employee ID");

	const [project, employee] = await Promise.all([
		Project.exists({ _id: projectId, organizationId }),
		Employee.exists({ _id: assignedTo, organizationId }),
	]);

	if (!project) {
		throw new ApiError(404, "Project not found");
	}

	if (!employee) {
		throw new ApiError(404, "Employee not found");
	}
};

const getTaskOrThrow = async (taskId, organizationId, { populate = false } = {}) => {
	ensureObjectId(taskId, "task ID");

	const query = Task.findOne({ _id: taskId, organizationId });

	if (populate) {
		query.populate(TASK_POPULATE);
	}

	const task = await query;

	if (!task) {
		throw new ApiError(404, "Task not found");
	}

	return task;
};

const buildTaskFilters = (query, organizationId) => {
	const filter = { organizationId };
	const { projectId, assignedTo, status } = query;

	if (projectId) {
		ensureObjectId(projectId, "project ID");
		filter.projectId = projectId;
	}

	if (assignedTo) {
		ensureObjectId(assignedTo, "employee ID");
		filter.assignedTo = assignedTo;
	}

	if (status) {
		if (!TASK_STATUSES.includes(status)) {
			throw new ApiError(400, "Invalid task status");
		}

		filter.status = status;
	}

	return filter;
};

export const applyTaskVisibilityFilter = async (req, filter, organizationId) => {
	if (isPrivilegedUser(req.user)) {
		return filter;
	}

	const employeeIds = await getEmployeeIdsForUser(req.user, organizationId);

	return {
		...filter,
		assignedTo: { $in: employeeIds },
	};
};

const getPagination = (query) => {
	const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
	const requestedLimit = Math.max(Number.parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE, 1);
	const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);
	const skip = (page - 1) * limit;

	return { page, limit, skip };
};

const getSort = (query) => {
	const allowedSortFields = new Set(["createdAt", "dueDate", "priority", "status"]);
	const sortBy = allowedSortFields.has(query.sortBy) ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder === "asc" ? 1 : -1;

	return { [sortBy]: sortOrder };
};

const sendPaginatedTasks = async (res, filter, query) => {
	const { page, limit, skip } = getPagination(query);
	const sort = getSort(query);

	const [tasks, total] = await Promise.all([
		Task.find(filter)
			.populate(TASK_POPULATE)
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.lean(),
		Task.countDocuments(filter),
	]);
	const serializedTasks = await serializeTasks(tasks);

	res.status(200).json({
		success: true,
		data: serializedTasks,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit),
		},
	});
};

const buildCreatePayload = async (req, organizationId) => {
	const {
		projectId,
		title,
		description = "",
		assignedTo,
		priority = "medium",
		estimatedHours,
		dueDate,
	} = req.body;

	if (!projectId || !assignedTo || !title?.trim()) {
		throw new ApiError(400, "Project, assigned employee, and title are required");
	}

	if (!TASK_PRIORITIES.includes(priority)) {
		throw new ApiError(400, "Invalid task priority");
	}

	const parsedEstimatedHours = parsePositiveNumber(
		estimatedHours,
		"Estimated hours",
		{ max: MAX_ESTIMATED_HOURS },
	);
	const parsedDueDate = parseDueDate(dueDate);

	await validateProjectAndEmployee({ projectId, assignedTo, organizationId });

	return {
		projectId,
		taskCode: await generateUniqueTaskCode(),
		title: title.trim(),
		description,
		assignedTo,
		assignedBy: req.user._id,
		priority,
		estimatedHours: parsedEstimatedHours,
		actualHours: 0,
		dueDate: parsedDueDate,
		startedAt: null,
		completedAt: null,
		status: "assigned",
		organizationId,
	};
};

const buildUpdatePayload = async (req, task, organizationId) => {
	if (task.status === "completed") {
		throw new ApiError(400, "Completed tasks cannot be updated");
	}

	const allowedFields = [
		"projectId",
		"title",
		"description",
		"assignedTo",
		"priority",
		"estimatedHours",
		"dueDate",
	];
	const updates = {};

	for (const field of allowedFields) {
		if (Object.prototype.hasOwnProperty.call(req.body, field)) {
			updates[field] = req.body[field];
		}
	}

	if (updates.title !== undefined) {
		if (!updates.title?.trim()) {
			throw new ApiError(400, "Task title cannot be empty");
		}

		updates.title = updates.title.trim();
	}

	if (updates.priority !== undefined && !TASK_PRIORITIES.includes(updates.priority)) {
		throw new ApiError(400, "Invalid task priority");
	}

	if (updates.estimatedHours !== undefined) {
		updates.estimatedHours = parsePositiveNumber(
			updates.estimatedHours,
			"Estimated hours",
			{ max: MAX_ESTIMATED_HOURS },
		);
	}

	if (updates.dueDate !== undefined) {
		updates.dueDate = parseDueDate(updates.dueDate);
	}

	const projectId = updates.projectId || task.projectId;
	const assignedTo = updates.assignedTo || task.assignedTo;

	await validateProjectAndEmployee({ projectId, assignedTo, organizationId });

	return updates;
};

const findActiveTimeLog = (task, organizationId) => TaskTimeLog.findOne({
	taskId: task._id,
	employeeId: task.assignedTo,
	organizationId,
	endedAt: null,
});

const findActiveTimeLogs = (task, organizationId) => TaskTimeLog.find({
	taskId: task._id,
	employeeId: task.assignedTo,
	organizationId,
	endedAt: null,
});

const createTimeLog = async (task, organizationId) => {
	const existingActiveLog = await findActiveTimeLog(task, organizationId);

	if (existingActiveLog) {
		throw new ApiError(409, "Task already has an active time log");
	}

	return TaskTimeLog.create({
		taskId: task._id,
		employeeId: task.assignedTo,
		projectId: task.projectId,
		organizationId,
		startedAt: new Date(),
	});
};

const closeActiveTimeLog = async (task, organizationId, { required = false } = {}) => {
	const activeLogs = await findActiveTimeLogs(task, organizationId);

	if (!activeLogs.length) {
		if (required) {
			throw new ApiError(409, "No active time log found for this task");
		}

		return 0;
	}

	const endedAt = new Date();
	let totalDurationMinutes = 0;

	await Promise.all(activeLogs.map(async (activeLog) => {
		const durationMinutes = calculateDurationMinutes(activeLog.startedAt, endedAt);
		totalDurationMinutes += durationMinutes;
		activeLog.endedAt = endedAt;
		activeLog.durationMinutes = durationMinutes;
		await activeLog.save();
	}));

	return totalDurationMinutes;
};

const getClosedUsedMinutesForTask = async (task, organizationId) => {
	const logs = await TaskTimeLog.find({
		taskId: task._id,
		organizationId,
		endedAt: { $ne: null },
	}).select("durationMinutes");

	return logs.reduce((total, log) => total + Number(log.durationMinutes || 0), 0);
};

const syncTaskActualHoursFromLogs = async (task, organizationId) => {
	const usedMinutes = await getClosedUsedMinutesForTask(task, organizationId);
	task.actualHours = roundHours(usedMinutes);
	return usedMinutes;
};

// Create task assignment
export const createTask = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const taskPayload = await buildCreatePayload(req, organizationId);
	const task = await Task.create(taskPayload);
	const populatedTask = await task.populate(TASK_POPULATE);
	const serializedTask = await serializeTaskWithTiming(populatedTask);

	res.status(201).json({
		success: true,
		message: "Task assigned successfully",
		data: serializedTask,
	});
});

// Get all task assignments with pagination, filters, and sorting
export const getTasks = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const filter = await applyTaskVisibilityFilter(
		req,
		buildTaskFilters(req.query, organizationId),
		organizationId,
	);

	await sendPaginatedTasks(res, filter, req.query);
});

// Get authenticated employee's task assignments
export const getMyTasks = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const employeeIds = await getEmployeeIdsForUser(req.user, organizationId);
	const filter = {
		...buildTaskFilters(req.query, organizationId),
		assignedTo: { $in: employeeIds },
	};

	await sendPaginatedTasks(res, filter, req.query);
});

// Get a single task assignment
export const getTaskById = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const task = await getTaskOrThrow(req.params.id, organizationId, { populate: true });

	await ensureCanManageTask(req, task, "view");
	const serializedTask = await serializeTaskWithTiming(task);

	res.status(200).json({ success: true, data: serializedTask });
});

// Update task assignment
export const updateTask = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const task = await getTaskOrThrow(req.params.id, organizationId);

	if (!isPrivilegedUser(req.user)) {
		throw new ApiError(403, "Only Admin, Manager, or Super Admin can update task details");
	}

	const updates = await buildUpdatePayload(req, task, organizationId);
	const updatedTask = await Task.findOneAndUpdate(
		{ _id: task._id, organizationId },
		updates,
		{ new: true, runValidators: true },
	).populate(TASK_POPULATE);
	const serializedTask = await serializeTaskWithTiming(updatedTask);

	res.status(200).json({
		success: true,
		message: "Task updated successfully",
		data: serializedTask,
	});
});

// Delete task assignment
export const deleteTask = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	ensureObjectId(req.params.id, "task ID");

	if (!isPrivilegedUser(req.user)) {
		throw new ApiError(403, "Only Admin, Manager, or Super Admin can delete tasks");
	}

	const task = await Task.findOneAndDelete({
		_id: req.params.id,
		organizationId,
	});

	if (!task) {
		throw new ApiError(404, "Task not found");
	}

	await TaskTimeLog.deleteMany({ taskId: task._id, organizationId });

	res.status(200).json({
		success: true,
		message: "Task deleted successfully",
	});
});

// Start assigned task
export const startTask = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const task = await getTaskOrThrow(req.params.id, organizationId);

	await ensureAssignedEmployeeCanAct(req, task, "start");
	ensureCurrentStatus(task.status, ["assigned"], "started");
	ensureStatusTransition(task.status, "in-progress");
	await createTimeLog(task, organizationId);

	task.status = "in-progress";
	task.startedAt = task.startedAt || new Date();
	await task.save();

	const populatedTask = await task.populate(TASK_POPULATE);
	const serializedTask = await serializeTaskWithTiming(populatedTask);

	res.status(200).json({
		success: true,
		message: "Task started successfully",
		data: serializedTask,
	});
});

// Pause in-progress task
export const pauseTask = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const task = await getTaskOrThrow(req.params.id, organizationId);

	await ensureAssignedEmployeeCanAct(req, task, "pause");
	ensureStatusTransition(task.status, "paused");

	await closeActiveTimeLog(task, organizationId, { required: true });
	await syncTaskActualHoursFromLogs(task, organizationId);
	task.status = "paused";
	await task.save();

	const populatedTask = await task.populate(TASK_POPULATE);
	const serializedTask = await serializeTaskWithTiming(populatedTask);

	res.status(200).json({
		success: true,
		message: "Task paused successfully",
		data: serializedTask,
	});
});

// Resume paused or blocked task
export const resumeTask = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const task = await getTaskOrThrow(req.params.id, organizationId);

	await ensureAssignedEmployeeCanAct(req, task, "resume");

	if (task.status === "in-progress") {
		const activeLog = await findActiveTimeLog(task, organizationId);

		if (!activeLog) {
			await createTimeLog(task, organizationId);
			task.startedAt = task.startedAt || new Date();
			await task.save();
		}

		const populatedTask = await task.populate(TASK_POPULATE);
		const serializedTask = await serializeTaskWithTiming(populatedTask);

		return res.status(200).json({
			success: true,
			message: activeLog
				? "Task is already in progress"
				: "Task timer resumed successfully",
			data: serializedTask,
		});
	}

	ensureCurrentStatus(task.status, ["paused", "blocked"], "resumed");
	ensureStatusTransition(task.status, "in-progress");
	await createTimeLog(task, organizationId);

	task.status = "in-progress";
	task.startedAt = task.startedAt || new Date();
	await task.save();

	const populatedTask = await task.populate(TASK_POPULATE);
	const serializedTask = await serializeTaskWithTiming(populatedTask);

	res.status(200).json({
		success: true,
		message: "Task resumed successfully",
		data: serializedTask,
	});
});

// Complete task and close active time log
export const completeTask = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const task = await getTaskOrThrow(req.params.id, organizationId);

	await ensureAssignedEmployeeCanAct(req, task, "complete");
	ensureStatusTransition(task.status, "completed");

	await closeActiveTimeLog(task, organizationId);
	await syncTaskActualHoursFromLogs(task, organizationId);
	task.status = "completed";
	task.completedAt = new Date();
	await task.save();

	const populatedTask = await task.populate(TASK_POPULATE);
	const serializedTask = await serializeTaskWithTiming(populatedTask);

	res.status(200).json({
		success: true,
		message: "Task completed successfully",
		data: serializedTask,
	});
});
