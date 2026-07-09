import express from "express";
import { body, param, query } from "express-validator";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import * as websiteLeadController from "../controllers/websiteLead.controller.js";

const router = express.Router();

const leadIdParamValidation = [
  param("id").isMongoId().withMessage("Invalid website lead ID"),
];

const leadListValidation = [
  query("status")
    .optional()
    .isIn(["new", "contacted", "converted", "closed"])
    .withMessage("Invalid lead status"),
  query("search").optional().trim().isLength({ min: 1 }).withMessage("Search cannot be empty"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive number"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
];

const createLeadValidation = [
  body("leadType")
    .optional()
    .isIn(["client", "career", "product"])
    .withMessage("Lead type must be client, career, or product"),
  body("productName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product name is required"),
  body("organizationName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Organization name is required"),
  body("organisationName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Organization name is required"),
  body("companyName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Organization name is required"),
  body("name").optional().trim().notEmpty().withMessage("Name is required"),
  body("yourName").optional().trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("serviceInterest")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Service interest is required"),
  body("projectBrief")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Project brief is required"),
  body("role")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Role is required"),
  body("currentStatus")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Current status cannot be empty"),
  body("portfolio")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Portfolio cannot be empty"),
  body("skills")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Skills cannot be empty"),
  body("message")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Message cannot be empty"),
  body("employeeSize")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Employee size is required"),
  body("employeeSizes")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Employee size is required"),
  body("employeeeSizes")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Employee size is required"),
];

const updateLeadValidation = [
  ...leadIdParamValidation,
  body("leadType")
    .optional()
    .isIn(["client", "career", "product"])
    .withMessage("Lead type must be client, career, or product"),
  body("productName").optional().trim().notEmpty().withMessage("Product name cannot be empty"),
  body("organizationName").optional().trim().notEmpty().withMessage("Organization name cannot be empty"),
  body("organisationName").optional().trim().notEmpty().withMessage("Organization name cannot be empty"),
  body("companyName").optional().trim().notEmpty().withMessage("Organization name cannot be empty"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("yourName").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().normalizeEmail().withMessage("Invalid email"),
  body("phone").optional().trim().notEmpty().withMessage("Phone cannot be empty"),
  body("serviceInterest").optional().trim().notEmpty().withMessage("Service interest cannot be empty"),
  body("projectBrief").optional().trim().notEmpty().withMessage("Project brief cannot be empty"),
  body("role").optional().trim().notEmpty().withMessage("Role cannot be empty"),
  body("currentStatus").optional().trim().notEmpty().withMessage("Current status cannot be empty"),
  body("portfolio").optional().trim().notEmpty().withMessage("Portfolio cannot be empty"),
  body("skills").optional().trim().notEmpty().withMessage("Skills cannot be empty"),
  body("message").optional().trim().notEmpty().withMessage("Message cannot be empty"),
  body("employeeSize").optional().trim().notEmpty().withMessage("Employee size cannot be empty"),
  body("employeeSizes").optional().trim().notEmpty().withMessage("Employee size cannot be empty"),
  body("employeeeSizes").optional().trim().notEmpty().withMessage("Employee size cannot be empty"),
  body("status")
    .optional()
    .isIn(["new", "contacted", "converted", "closed"])
    .withMessage("Invalid lead status"),
];

router.post(
  "/",
  createLeadValidation,
  validateRequest,
  websiteLeadController.createWebsiteLead,
);

router.get(
  "/",
  authMiddleware,
  leadListValidation,
  validateRequest,
  websiteLeadController.getWebsiteLeads,
);

router.get(
  "/:id",
  authMiddleware,
  leadIdParamValidation,
  validateRequest,
  websiteLeadController.getWebsiteLeadById,
);

router.put(
  "/:id",
  authMiddleware,
  updateLeadValidation,
  validateRequest,
  websiteLeadController.updateWebsiteLead,
);

router.delete(
  "/:id",
  authMiddleware,
  leadIdParamValidation,
  validateRequest,
  websiteLeadController.deleteWebsiteLead,
);

export default router;
