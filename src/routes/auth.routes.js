import express from "express";
import { body } from "express-validator";
import { login, refresh, logout } from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { loginRateLimiter } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

/**
 * LOGIN
 */
router.post(
  "/login",
  loginRateLimiter,
  [
    body("email").trim().isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validateRequest,
  login
);

/**
 * REFRESH TOKEN
 */
router.post("/refresh", refresh);

/**
 * LOGOUT
 */
router.post("/logout", authMiddleware, logout);

export default router;
