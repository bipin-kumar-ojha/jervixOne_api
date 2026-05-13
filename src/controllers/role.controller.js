import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

/* ============================
   Create Role
============================ */
export const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;

  if (!name) {
    throw new ApiError(400, "Role name is required");
  }

  const existingRole = await Role.findOne({ name });
  if (existingRole) {
    throw new ApiError(409, "Role already exists");
  }
  const currentUser = req.user;

  if (!currentUser.role.isSystem) {
    const currentPermissions = currentUser.role.permissions || [];
    const requestedPermissions = permissions || [];
    const isEscalation = requestedPermissions.some(
      (perm) => !currentPermissions.includes(perm)
    );

    if (isEscalation) {
      throw new ApiError(
        403,
        "You cannot assign permissions higher than your own"
      );
    }
  }
  const role = await Role.create({
    name,
    description,
    permissions: permissions || [],
  });

  res.status(201).json({
    success: true,
    message: "Role created successfully",
    data: {
      id: role._id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
    },
  });
});

/* ============================
   Get All Roles
============================ */
export const getRoles = asyncHandler(async (req, res) => {
  console.log("Fetching all roles");
  const roles = await Role.find()
    .select("name description permissions isSystem createdAt")
    .sort({ createdAt: -1 })
    .lean();
    console.log(`Found ${roles.length} roles`);

  res.status(200).json({
    success: true,
    data: roles.map((r) => ({
      id: r._id,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      isSystem: r.isSystem,
      createdAt: r.createdAt,
    })),
  });
});

/* ============================
   Get Role By ID
============================ */
export const getRoleById = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id)
    .select("name description permissions isSystem createdAt")
    .lean();

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  res.status(200).json({
    success: true,
    data: role,
  });
});

/* ============================
   Update Role
============================ */
export const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  const role = await Role.findById(id);

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  // 🚫 Protect system roles
  if (role.isSystem) {
    throw new ApiError(403, "System roles cannot be modified");
  }

  /* ===============================
     🔐 Escalation Protection
  =============================== */
  if (permissions !== undefined) {
    if (!req.user.role.isSystem) {
      const currentPermissions = req.user.role.permissions || [];
      const requestedPermissions = permissions || [];
      const isEscalation = requestedPermissions.some(
        (perm) => !currentPermissions.includes(perm)
      );

      if (isEscalation) {
        throw new ApiError(
          403,
          "You cannot assign permissions higher than your own"
        );
      }
    }
  }

  /* ===============================
     Apply Updates After Validation
  =============================== */
  if (name) role.name = name;
  if (description !== undefined) role.description = description;
  if (permissions !== undefined) role.permissions = permissions;

  await role.save();

  res.status(200).json({
    success: true,
    message: "Role updated successfully",
    data: {
      id: role._id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
    },
  });
});

/* ============================
   Delete Role
============================ */
export const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await Role.findById(id);

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  // 🚫 Prevent deleting system role
  if (role.isSystem) {
    throw new ApiError(403, "System roles cannot be deleted");
  }

  // 🚫 Prevent deleting role assigned to users
  const usersWithRole = await User.exists({
    role: role._id,
    isDeleted: false,
  });

  if (usersWithRole) {
    throw new ApiError(
      400,
      "Cannot delete role assigned to existing users"
    );
  }

  await role.deleteOne();

  res.status(200).json({
    success: true,
    message: "Role deleted successfully",
    data: null,
  });
});