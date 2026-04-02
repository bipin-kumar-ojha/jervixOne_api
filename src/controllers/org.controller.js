import mongoose from "mongoose";
import Organization from "../models/organization.model.js";
import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js"; // adjust path to your Role model
import { generateOrgCode, generateActivationCode } from "../utils/generateOrgCode.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { logAudit } from "../services/audit.service.js";
import { welcomeTemplate } from "../utils/welcome.template.js";
import { sendEmail } from "../services/mail.service.js";
import { newOrgNotificationTemplate } from "../utils/newOrgNotification.template.js";

// ─────────────────────────────────────────
// POST /api/v1/org/register
// Public route — no auth required
// ─────────────────────────────────────────
export const registerOrganization = asyncHandler(async (req, res) => {
  const { orgName, adminName, adminEmail, adminPassword } = req.body;

  const existingUser = await User.findOne({ 
    email: adminEmail.toLowerCase().trim() 
  });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const adminRole = await Role.findOne({ name: { $regex: /^admin$/i } });
  if (!adminRole) {
    throw new ApiError(500, "Admin role not configured. Contact support.");
  }

  // Create org first
  const org = await Organization.create({
    name: orgName.trim(),
    orgCode: generateOrgCode(),
    activationCode: generateActivationCode(),
    subscriptionStatus: "inactive",
    plan: "free",
  });

  // Create admin user — if this fails, manually clean up org
  let adminUser;
  try {
    adminUser = await User.create({
      name: adminName.trim(),
      email: adminEmail.toLowerCase().trim(),
      password: adminPassword,
      role: adminRole._id,
      organizationId: org._id,
      isActive: true,
    });
  } catch (userError) {
    // Clean up the org if user creation fails
    await Organization.findByIdAndDelete(org._id);
    throw userError;
  }

  // Link owner
  org.ownerId = adminUser._id;
  await org.save();

  sendEmail({
    to: adminUser.email,
    subject: "Welcome to Jervix One! Activate Your Organization",
    html: welcomeTemplate({
      name: adminUser.name,
      orgName: org.name,
    }),
  }).catch((err) => {
    console.error("Email failed:", err.message);
  });

  sendEmail({
      to: "info@jervix.com",
      subject: "New Organization Registered — Jervix",
      html: newOrgNotificationTemplate({
        orgName: org.name,
        adminName: adminUser.name,
        adminEmail: adminUser.email,
        orgCode: org.orgCode,
        createdAt: new Date().toLocaleString(),
      }),
    }).catch((err) => {
      console.error("Admin email failed:", err.message);
    });

  await logAudit({
    userId: adminUser._id,
    action: "ORG_REGISTERED",
    resource: "Organization",
    metadata: { orgId: org._id, orgName: org.name },
    req,
  });

  res.status(201).json({
    success: true,
    message: "Organization registered. Use your activation code to get started.",
    data: {
      organization: {
        id: org._id,
        name: org.name,
        orgCode: org.orgCode,
        subscriptionStatus: org.subscriptionStatus,
      },
      admin: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
      },
    },
  });
});

// ─────────────────────────────────────────
// POST /api/v1/org/activate
// Protected route — requires login first
// ─────────────────────────────────────────
export const activateOrganization = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const orgId = req.user.organizationId;

  if (!orgId) {
    throw new ApiError(400, "No organization linked to your account");
  }

  const org = await Organization.findById(orgId);

  if (!org) {
    throw new ApiError(404, "Organization not found");
  }

  if (org.subscriptionStatus === "active") {
    return res.status(200).json({
      success: true,
      message: "Organization is already active",
    });
  }

  if (org.activationCodeUsed) {
    throw new ApiError(400, "Activation code has already been used");
  }

  // Validate code against this specific org
  if (!org.activationCode || org.activationCode.toUpperCase() !== code.trim().toUpperCase()) {
    await logAudit({
      userId: req.user._id,
      action: "ACTIVATION_FAILED",
      resource: "Organization",
      metadata: { orgId },
      req,
    });
    throw new ApiError(400, "Invalid activation code");
  }

  // Activate
  org.subscriptionStatus = "active";
  org.activationCodeUsed = true;
  org.activationCode     = null;
  org.expiresAt          = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await org.save({ validateBeforeSave: false });

  await logAudit({
    userId: req.user._id,
    action: "ORG_ACTIVATED",
    resource: "Organization",
    metadata: { orgId },
    req,
  });

  res.status(200).json({
    success: true,
    message: "Organization activated successfully!",
    data: {
      organization: {
        id: org._id,
        name: org.name,
        plan: org.plan,
        subscriptionStatus: org.subscriptionStatus,
        expiresAt: org.expiresAt,
      },
    },
  });
});

// ─────────────────────────────────────────
// GET /api/v1/org/me
// Get current user's organization details
// ─────────────────────────────────────────
export const getMyOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.organizationId)
    .populate("ownerId", "name email");

  if (!org) {
    throw new ApiError(404, "Organization not found");
  }

  res.status(200).json({
    success: true,
    data: org,
  });
});