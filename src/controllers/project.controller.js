import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { applyTaskVisibilityFilter, getTimingSummaries, TASK_STATUSES } from "./task.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const TASK_SUMMARY_POPULATE = [
	{ path: "assignedTo", select: "name officialEmail personalEmail status" },
	{ path: "assignedBy", select: "name email" },
];

const ensureOrganization = (req) => {
	if (!req.user.organizationId) {
		throw new ApiError(400, "No organization linked to your account");
	}

	return req.user.organizationId;
};

const toObjectIdString = (value) => value?._id?.toString?.() || value?.toString?.();

const serializeAssignee = (employee) => {
	if (!employee) {
		return null;
	}

	return {
		employeeId: toObjectIdString(employee._id),
		name: employee.name,
		email: employee.officialEmail || employee.personalEmail || null,
		status: employee.status,
	};
};

const serializeAssignedBy = (user) => {
	if (!user) {
		return null;
	}

	return {
		userId: toObjectIdString(user._id),
		name: user.name,
		email: user.email,
	};
};

const getTaskTiming = (task, timingSummaries) => {
	const estimatedMinutes = Math.round(Number(task.estimatedHours || 0) * 60);

	return timingSummaries.get(toObjectIdString(task._id)) || {
		estimatedMinutes,
		usedMinutes: 0,
		remainingMinutes: estimatedMinutes,
		activeTimerStartedAt: null,
	};
};

const buildStatusCounts = () => Object.fromEntries(
	TASK_STATUSES.map((status) => [status, 0]),
);

const addEmployeeSummary = (employeeSummaries, task, timing) => {
	const employee = task.assignedTo;
	const employeeId = toObjectIdString(employee?._id || task.assignedTo);

	if (!employeeId) {
		return;
	}

	if (!employeeSummaries.has(employeeId)) {
		employeeSummaries.set(employeeId, {
			employeeId,
			name: employee?.name || null,
			email: employee?.officialEmail || employee?.personalEmail || null,
			totalConsumedMinutes: 0,
			activeTaskCount: 0,
			completedTaskCount: 0,
			status: employee?.status || null,
		});
	}

	const summary = employeeSummaries.get(employeeId);
	summary.totalConsumedMinutes += timing.usedMinutes;

	if (task.status === "in-progress") {
		summary.activeTaskCount += 1;
	}

	if (task.status === "completed") {
		summary.completedTaskCount += 1;
	}
};

const serializeSummaryTask = (task, timing) => ({
	taskId: toObjectIdString(task._id),
	title: task.title,
	status: task.status,
	priority: task.priority,
	assignedTo: serializeAssignee(task.assignedTo),
	assignedBy: serializeAssignedBy(task.assignedBy),
	estimatedMinutes: timing.estimatedMinutes,
	consumedMinutes: timing.usedMinutes,
	remainingMinutes: timing.remainingMinutes,
	startedAt: task.startedAt,
	completedAt: task.completedAt,
	dueDate: task.dueDate,
});

// Create a new project
export const createProject = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);

	const project = await Project.create({
		...req.body,
		organizationId,
	});
	res.status(201).json({ success: true, data: project });
});

// Get all projects
export const getProjects = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);

	const projects = await Project.find({ organizationId });
	res.status(200).json({ success: true, data: projects });
});

// Get project-level task analytics and task timing details
export const getProjectTaskSummary = asyncHandler(async (req, res) => {
	const organizationId = ensureOrganization(req);
	const { projectId } = req.params;

	const project = await Project.findOne({
		_id: projectId,
		organizationId,
	}).select("_id projectName").lean();

	if (!project) {
		throw new ApiError(404, "Project not found");
	}

	const taskFilter = await applyTaskVisibilityFilter(
		req,
		{ projectId, organizationId },
		organizationId,
	);
	const tasks = await Task.find(taskFilter)
		.populate(TASK_SUMMARY_POPULATE)
		.sort({ createdAt: -1 })
		.lean();
	const timingSummaries = await getTimingSummaries(tasks);
	const statusCounts = buildStatusCounts();
	const employeeSummaries = new Map();
	let totalEstimatedMinutes = 0;
	let totalConsumedMinutes = 0;
	let totalRemainingMinutes = 0;

	const taskList = tasks.map((task) => {
		const timing = getTaskTiming(task, timingSummaries);

		statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
		totalEstimatedMinutes += timing.estimatedMinutes;
		totalConsumedMinutes += timing.usedMinutes;
		totalRemainingMinutes += timing.remainingMinutes;
		addEmployeeSummary(employeeSummaries, task, timing);

		return serializeSummaryTask(task, timing);
	});

	res.status(200).json({
		success: true,
		data: {
			projectId: project._id,
			projectName: project.projectName,
			totalEstimatedMinutes,
			totalConsumedMinutes,
			totalRemainingMinutes,
			taskStatusCounts: statusCounts,
			employeeTaskTimeSummary: Array.from(employeeSummaries.values()),
			tasks: taskList,
		},
	});
});

// Get a single project by ID
export const getProjectById = asyncHandler(async (req, res) => {
	const project = await Project.findOne({
		_id: req.params.id,
		organizationId: req.user.organizationId,
	});
	if (!project) throw new ApiError(404, 'Project not found');
	res.status(200).json({ success: true, data: project });
});

// Update a project by ID
export const updateProject = asyncHandler(async (req, res) => {
	const project = await Project.findOneAndUpdate(
		{ _id: req.params.id, organizationId: req.user.organizationId },
		req.body,
		{ new: true, runValidators: true },
	);
	if (!project) throw new ApiError(404, 'Project not found');
	res.status(200).json({ success: true, data: project });
});

// Delete a project by ID
export const deleteProject = asyncHandler(async (req, res) => {
	const project = await Project.findOneAndDelete({
		_id: req.params.id,
		organizationId: req.user.organizationId,
	});
	if (!project) throw new ApiError(404, 'Project not found');
	res.status(200).json({ success: true, message: 'Project deleted successfully' });
});
