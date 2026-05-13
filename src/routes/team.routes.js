import express from "express";
import {
	createTeam,
	getTeams,
	deleteTeam,
	updateTeam,
	getTeamById,
} from "../controllers/team.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";

const router = express.Router();

router.post(
	"/",
	authMiddleware,
	requirePermission("teams.create"),
	createTeam
);

router.put(
	"/:id",
	authMiddleware,
	requirePermission("teams.update"),
	updateTeam
);

router.get(
	"/",
	authMiddleware,
	requirePermission("teams.view"),
	getTeams
);

router.get(
	"/:id",
	authMiddleware,
	requirePermission("teams.view"),
	getTeamById
);

router.delete(
	"/:id",
	authMiddleware,
	requirePermission("teams.delete"),
	deleteTeam
);

export default router;
