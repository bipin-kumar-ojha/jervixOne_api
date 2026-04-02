import express from "express";
import { body } from "express-validator";
import {
  registerOrganization,
  activateOrganization,
  getMyOrganization,
} from "../controllers/org.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";

const router = express.Router();

// ── Public: No login needed ──────────────
router.post(
  "/register",
  [
    body("orgName").notEmpty().withMessage("Organization name is required"),
    body("adminName").notEmpty().withMessage("Admin name is required"),
    body("adminEmail").isEmail().withMessage("Valid email required"),
    body("adminPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  validateRequest,
  registerOrganization
);

// ── Protected: Must be logged in ─────────
router.post(
  "/activate",
  authMiddleware,
  [body("code").notEmpty().withMessage("Activation code is required")],
  validateRequest,
  activateOrganization
);

router.get("/me", authMiddleware, getMyOrganization);

export default router;