import Project from "../models/project.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// Create a new project
export const createProject = asyncHandler(async (req, res) => {
	if (!req.user.organizationId) {
		throw new ApiError(400, "No organization linked to your account");
	}

	const project = await Project.create({
		...req.body,
		organizationId: req.user.organizationId,
	});
	res.status(201).json({ success: true, data: project });
});

// Get all projects
export const getProjects = asyncHandler(async (req, res) => {
	if (!req.user.organizationId) {
		throw new ApiError(400, "No organization linked to your account");
	}

	const projects = await Project.find({ organizationId: req.user.organizationId });
	res.status(200).json({ success: true, data: projects });
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
