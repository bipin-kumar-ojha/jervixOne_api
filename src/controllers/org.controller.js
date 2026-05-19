import Organization from "../models/organization.model.js";
import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js"; // adjust path to your Role model
import { PERMISSIONS } from "../constants/permissions.js";
import { generateOrgCode, generateActivationCode } from "../utils/generateOrgCode.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { logAudit } from "../services/audit.service.js";
import { welcomeTemplate } from "../utils/welcome.template.js";
import { sendEmail } from "../services/mail.service.js";
import { newOrgNotificationTemplate } from "../utils/newOrgNotification.template.js";

const defaultRoles = [
  {
    name: "Super Admin",
    description: "Full access to all modules",
    permissions: [],
    isSystem: true,
  },
  {
    name: "Admin",
    description: "Manage organization users, roles, employees, and settings",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.ROLES_CREATE,
      PERMISSIONS.ROLES_UPDATE,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.EMPLOYEE_CREATE,
      PERMISSIONS.EMPLOYEE_UPDATE,
      PERMISSIONS.ORG_HIERARCHY_VIEW,
      PERMISSIONS.DEPARTMENTS_VIEW,
      PERMISSIONS.DEPARTMENTS_CREATE,
      PERMISSIONS.DESIGNATION_VIEW,
      PERMISSIONS.DESIGNATION_CREATE,
      PERMISSIONS.INVITATIONS_VIEW,
      PERMISSIONS.PROJECTS_VIEW,
      PERMISSIONS.PROJECTS_CREATE,
      PERMISSIONS.PROJECTS_ASSIGN,
      PERMISSIONS.TASK_MANAGEMENT_VIEW,
      PERMISSIONS.TASK_ASSIGNMENTS_VIEW,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.TEAMS_CREATE,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.ACTIVITY_LOGS_VIEW,
    ],
  },
  {
    name: "Manager",
    description: "Manage teams, projects, and employee visibility",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.DEPARTMENTS_VIEW,
      PERMISSIONS.DESIGNATION_VIEW,
      PERMISSIONS.PROJECTS_VIEW,
      PERMISSIONS.PROJECTS_CREATE,
      PERMISSIONS.PROJECTS_UPDATE,
      PERMISSIONS.PROJECTS_ASSIGN,
      PERMISSIONS.TASK_MANAGEMENT_VIEW,
      PERMISSIONS.TASK_ASSIGNMENTS_VIEW,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.TEAMS_CREATE,
      PERMISSIONS.TEAMS_UPDATE,
    ],
  },
  {
    name: "Employee",
    description: "Basic employee access",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.PROJECTS_VIEW,
      PERMISSIONS.TASK_MANAGEMENT_VIEW,
      PERMISSIONS.TASK_ASSIGNMENTS_VIEW,
      PERMISSIONS.TEAMS_VIEW,
    ],
  },
  {
    name: "HR",
    description: "Manage employee, department, and designation records",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.EMPLOYEE_CREATE,
      PERMISSIONS.EMPLOYEE_UPDATE,
      PERMISSIONS.EMPLOYEE_DELETE,
      PERMISSIONS.ORG_HIERARCHY_VIEW,
      PERMISSIONS.DEPARTMENTS_VIEW,
      PERMISSIONS.DEPARTMENTS_CREATE,
      PERMISSIONS.DEPARTMENTS_UPDATE,
      PERMISSIONS.DEPARTMENTS_DELETE,
      PERMISSIONS.DESIGNATION_VIEW,
      PERMISSIONS.DESIGNATION_CREATE,
      PERMISSIONS.DESIGNATION_UPDATE,
      PERMISSIONS.DESIGNATION_DELETE,
      PERMISSIONS.INVITATIONS_VIEW,
      PERMISSIONS.TEAMS_VIEW,
    ],
  },
];

const ensureRoleIndexes = async () => {
  const indexes = await Role.collection.indexes();
  const staleNameIndex = indexes.find((index) => {
    return index.name === "name_1"
      && index.unique
      && Object.keys(index.key).length === 1
      && index.key.name === 1;
  });

  if (staleNameIndex) {
    await Role.collection.dropIndex(staleNameIndex.name);
  }

  await Role.collection.createIndex(
    { name: 1, organizationId: 1 },
    { unique: true }
  );
};

const createDefaultRolesForOrganization = async (organizationId) => {
  await ensureRoleIndexes();

  const roles = [];

  for (const role of defaultRoles) {
    const savedRole = await Role.findOneAndUpdate(
      { name: role.name, organizationId },
      {
        $setOnInsert: {
          ...role,
          organizationId,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    roles.push(savedRole);
  }

  return roles;
};

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

  const adminRole = await Role.findOne({
    name: { $regex: /^admin$/i },
    organizationId: null,
  });
  if (!adminRole) {
    throw new ApiError(500, "Admin role not configured. Contact support.");
  }

  // Create org first
  const org = await Organization.create({
    name: orgName.trim(),
    orgCode: generateOrgCode(),
    activationCode: generateActivationCode(),
    subscriptionStatus: "inactive",
    subscriptionKey: "Free Trial",
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
    organizationId: org._id,
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
    const roles = await createDefaultRolesForOrganization(org._id);
    const superAdminRole = roles.find((role) => role.name === "Super Admin");

    if (superAdminRole && org.ownerId) {
      await User.findByIdAndUpdate(org.ownerId, {
        role: superAdminRole._id,
        organizationId: org._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Organization is already active",
      data: {
        roles: roles.map((role) => ({
          id: role._id,
          name: role.name,
          permissions: role.permissions,
          isSystem: role.isSystem,
        })),
      },
    });
  }

  if (org.activationCodeUsed) {
    throw new ApiError(400, "Activation code has already been used");
  }

  // Validate code against this specific org
  if (!org.activationCode || org.activationCode.toUpperCase() !== code.trim().toUpperCase()) {
    await logAudit({
      userId: req.user._id,
      organizationId: org._id,
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

  const roles = await createDefaultRolesForOrganization(org._id);
  const superAdminRole = roles.find((role) => role.name === "Super Admin");

  if (superAdminRole && org.ownerId) {
    await User.findByIdAndUpdate(org.ownerId, {
      role: superAdminRole._id,
      organizationId: org._id,
    });
  }

  await logAudit({
    userId: req.user._id,
    organizationId: org._id,
    action: "ORG_ACTIVATED",
    resource: "Organization",
    metadata: { orgId, defaultRolesCreated: roles.map((role) => role.name) },
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
        subscriptionKey: org.subscriptionKey,
        subscriptionStatus: org.subscriptionStatus,
        expiresAt: org.expiresAt,
      },
      roles: roles.map((role) => ({
        id: role._id,
        name: role.name,
        permissions: role.permissions,
        isSystem: role.isSystem,
      })),
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
