import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const normalizeRoleName = (roleName = "") => String(roleName).trim().toLowerCase();

const isSuperAdminRole = (role) => {
  return Boolean(role?.isSystem || normalizeRoleName(role?.name) === "super admin");
};

const isSuperAdminUser = (user) => isSuperAdminRole(user?.role);

const getSuperAdminRoleIds = async (organizationId) => {
  return Role.find({
    organizationId,
    $or: [
      { name: /^super admin$/i },
      { isSystem: true },
    ],
  }).distinct("_id");
};

const ensureCanAccessUser = (currentUser, targetUser) => {
  if (isSuperAdminRole(targetUser?.role) && !isSuperAdminUser(currentUser)) {
    throw new ApiError(404, "User not found");
  }
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isActive: user.isActive,
  role: user.role
    ? {
        id: user.role._id,
        name: user.role.name,
      }
    : null,
  createdAt: user.createdAt,
});

export const createUser = asyncHandler(async (req, res) => {

  const { name, email, password, role } = req.body;
  const organizationId = req.user.organizationId;

  if (!name || !email || !password || !role) {
    throw new ApiError(400, 'All fields required');
  }

  if (!organizationId) {
    throw new ApiError(400, "No organization linked to your account");
  }

  const [roleExists, existingUser] = await Promise.all([
    Role.findOne({ _id: role, organizationId })
      .select("_id name permissions isSystem")
      .lean(),
    User.exists({ email, isDeleted: false }),
  ]);

  if (!roleExists) {
    throw new ApiError(400, 'Invalid role selected');
  }

  if (isSuperAdminRole(roleExists) && !isSuperAdminUser(req.user)) {
    throw new ApiError(403, "Only Super Admin can create Super Admin users");
  }

  if (existingUser) {
    throw new ApiError(409, 'User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    organizationId,
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: roleExists.name
    }
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  if (!req.user.organizationId) {
    throw new ApiError(400, "No organization linked to your account");
  }

  const filter = {
    organizationId: req.user.organizationId,
    isDeleted: false,
  };

  if (!isSuperAdminUser(req.user)) {
    const superAdminRoleIds = await getSuperAdminRoleIds(req.user.organizationId);
    filter.role = { $nin: superAdminRoleIds };
  }

  const users = await User.find(filter)
    .select("name email isActive role createdAt")
    .populate("role", "name")
    .sort({ createdAt: -1 })
    .lean();

  const sanitizedUsers = users.map(sanitizeUser);

  res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: sanitizedUsers,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user._id.toString() === id) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  const user = await User.findOne({
    _id: id,
    organizationId: req.user.organizationId,
    isDeleted: false,
  }).populate("role", "name isSystem");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  ensureCanAccessUser(req.user, user);

  user.isDeleted = true;
  user.tokenVersion += 1;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
    data: null,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, role, isActive } = req.body;

  const existingUser = await User.findOne({
    _id: id,
    organizationId: req.user.organizationId,
  })
    .select("name email role isActive isDeleted tokenVersion")
    .populate("role", "name permissions isSystem");

  if (!existingUser || existingUser.isDeleted) {
    throw new ApiError(404, "User not found");
  }

  const currentUser = req.user;
  ensureCanAccessUser(currentUser, existingUser);

  /* ===============================
     🚫 Prevent Self Role Modification
  =============================== */
  if (currentUser._id.toString() === id && role) {
    throw new ApiError(
      403,
      "You cannot change your own role"
    );
  }

  /* ===============================
     🚫 Prevent Self Deactivation
  =============================== */
  if (
    currentUser._id.toString() === id &&
    isActive === false
  ) {
    throw new ApiError(
      403,
      "You cannot deactivate your own account"
    );
  }

  /* ===============================
     🚫 Email Conflict Check
  =============================== */
  if (email && email !== existingUser.email) {
    const emailExists = await User.exists({
      email,
      _id: { $ne: id },
      isDeleted: false,
    });

    if (emailExists) {
      throw new ApiError(409, "Email already in use");
    }
  }

  /* ===============================
     🚫 Role Escalation Protection
  =============================== */
  if (role) {
    const newRole = await Role.findOne({
      _id: role,
      organizationId: req.user.organizationId,
    }).select("name permissions isSystem").lean();

    if (!newRole) {
      throw new ApiError(400, "Invalid role selected");
    }

    // 🚫 Only system users can assign system roles
    if (isSuperAdminRole(newRole) && !isSuperAdminUser(currentUser)) {
      throw new ApiError(
        403,
        "Only Super Admin can assign a Super Admin role"
      );
    }

    // 🚫 Cannot assign permissions higher than your own
    if (!currentUser.role.isSystem) {
      const currentPermissions =
        currentUser.role.permissions || [];

      const roleHasHigherPermission =
        newRole.permissions.some(
          (perm) => !currentPermissions.includes(perm)
        );

      if (roleHasHigherPermission) {
        throw new ApiError(
          403,
          "You cannot assign a role with higher permissions than your own"
        );
      }
    }
  }

  /* ===============================
     Update Fields
  =============================== */
  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;

  // Invalidate tokens if role or active status changed
  if (
    role ||
    (isActive !== undefined &&
      isActive !== existingUser.isActive)
  ) {
    updateData.tokenVersion =
      existingUser.tokenVersion + 1;
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: id, organizationId: req.user.organizationId, isDeleted: false },
    updateData,
    { new: true }
  )
    .populate("role", "name permissions isSystem")
    .lean();

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isActive: updatedUser.isActive,
      role: {
        id: updatedUser.role._id,
        name: updatedUser.role.name,
      },
    },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOne({
    _id: id,
    organizationId: req.user.organizationId,
    isDeleted: false,
  })
    .select("name email isActive role createdAt")
    .populate("role", "name isSystem")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  ensureCanAccessUser(req.user, user);

  res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: sanitizeUser(user),
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    throw new ApiError(
      400,
      "Password must be at least 6 characters"
    );
  }

  const user = await User.findOne({
    _id: id,
    organizationId: req.user.organizationId,
    isDeleted: false,
  })
    .select("+password")
    .populate("role", "name isSystem");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  ensureCanAccessUser(req.user, user);

  user.password = password;
  user.tokenVersion += 1;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
    data: {
      id: user._id,
      email: user.email,
    },
  });
});
