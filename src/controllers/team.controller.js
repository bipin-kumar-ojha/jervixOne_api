import { Team } from "../models/team.model.js";
import { Employee } from "../models/employee.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// CREATE
export const createTeam = asyncHandler(async (req, res) => {
	const { teamName, department, teamLead, members } = req.body;
	if (!teamName || !department || !teamLead) {
		throw new ApiError(400, "Missing required fields");
	}

	// Validate teamLead exists
	const leadExists = await Employee.exists({
		_id: teamLead,
		organizationId: req.user.organizationId,
	});
	if (!leadExists) {
		throw new ApiError(400, "Team lead not found");
	}

	// Validate members if provided
	let validMembers = [];
	if (Array.isArray(members) && members.length > 0) {
		validMembers = await Employee.find({
			_id: { $in: members },
			organizationId: req.user.organizationId,
		}).distinct('_id');
	}

	const team = await Team.create({
		teamName,
		department,
		teamLead,
		members: validMembers,
		organizationId: req.user.organizationId,
	});

	res.status(201).json({
		success: true,
		message: "Team created",
		data: team,
	});
});

// UPDATE
export const updateTeam = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const team = await Team.findOne({
		_id: id,
		organizationId: req.user.organizationId,
	});
	if (!team) {
		throw new ApiError(404, "Team not found");
	}

	const { teamName, department, teamLead, members, status } = req.body;

	if (teamName) team.teamName = teamName;
	if (department) team.department = department;
	if (teamLead) {
		const leadExists = await Employee.exists({
			_id: teamLead,
			organizationId: req.user.organizationId,
		});
		if (!leadExists) {
			throw new ApiError(400, "Team lead not found");
		}
		team.teamLead = teamLead;
	}
	if (Array.isArray(members)) {
		const validMembers = await Employee.find({
			_id: { $in: members },
			organizationId: req.user.organizationId,
		}).distinct('_id');
		team.members = validMembers;
	}
	if (status) team.status = status;

	await team.save();

	res.status(200).json({
		success: true,
		message: "Team updated",
		data: team,
	});
});

// GET ALL
export const getTeams = asyncHandler(async (req, res) => {
	const teams = await Team.find({
		organizationId: req.user.organizationId,
	})
		.populate("department", "name")
		.populate("teamLead", "name")
		.populate("members", "name")
		.sort({ createdAt: -1 })
		.lean();

	res.status(200).json({
		success: true,
		data: teams,
	});
});

// GET BY ID
export const getTeamById = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const team = await Team.findOne({
		_id: id,
		organizationId: req.user.organizationId,
	})
		.populate("department", "name")
		.populate("teamLead", "name")
		.populate("members", "name")
		.lean();

	if (!team) {
		throw new ApiError(404, "Team not found");
	}

	res.status(200).json({
		success: true,
		data: team,
	});
});

// DELETE
export const deleteTeam = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const team = await Team.findOne({
		_id: id,
		organizationId: req.user.organizationId,
	});
	if (!team) {
		throw new ApiError(404, "Team not found");
	}
	await team.deleteOne();
	res.json({
		success: true,
		message: "Team deleted",
	});
});
