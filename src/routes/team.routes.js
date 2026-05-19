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
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

router.post(
	"/",
	authMiddleware,
	requirePermission(PERMISSIONS.TEAMS_CREATE),
	createTeam
);

router.put(
	"/:id",
	authMiddleware,
	requirePermission(PERMISSIONS.TEAMS_UPDATE),
	updateTeam
);

router.get(
	"/",
	authMiddleware,
	requirePermission(PERMISSIONS.TEAMS_VIEW),
	getTeams
);

router.get(
	"/:id",
	authMiddleware,
	requirePermission(PERMISSIONS.TEAMS_VIEW),
	getTeamById
);

router.delete(
	"/:id",
	authMiddleware,
	requirePermission(PERMISSIONS.TEAMS_DELETE),
	deleteTeam
);

export default router;
