import Project from "../models/project.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// Create a new project
export const createProject = asyncHandler(async (req, res) => {
	const project = await Project.create(req.body);
	console.log('Project created:', project);
	res.status(201).json({ success: true, data: project });
});

// Get all projects
export const getProjects = asyncHandler(async (req, res) => {
	const projects = await Project.find();
	res.status(200).json({ success: true, data: projects });
});

// Get a single project by ID
export const getProjectById = asyncHandler(async (req, res) => {
	const project = await Project.findById(req.params.id);
	if (!project) throw new ApiError(404, 'Project not found');
	res.status(200).json({ success: true, data: project });
});

// Update a project by ID
export const updateProject = asyncHandler(async (req, res) => {
	const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
	if (!project) throw new ApiError(404, 'Project not found');
	res.status(200).json({ success: true, data: project });
});

// Delete a project by ID
export const deleteProject = asyncHandler(async (req, res) => {
	const project = await Project.findByIdAndDelete(req.params.id);
	if (!project) throw new ApiError(404, 'Project not found');
	res.status(200).json({ success: true, message: 'Project deleted successfully' });
});
