import { ApiError } from "../utils/ApiError.js";

const normalizeRoleName = (roleName = "") => String(roleName).trim().toLowerCase();

const isSuperAdminRole = (role) => {
  return Boolean(role?.isSystem || normalizeRoleName(role?.name) === "super admin");
};

/**
 * Role Guard
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.name;

    if (isSuperAdminRole(req.user?.role)) {
      return next();
    }

    if (!userRole || !roles.includes(userRole)) {
      throw new ApiError(403, "Forbidden: insufficient role");
    }

    next();
  };
};

/**
 * Permission Guard
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (isSuperAdminRole(req.user?.role)) {
      return next();
    }

    const permissions = req.user?.role?.permissions || [];

    if (!permissions.includes(permission)) {
      throw new ApiError(403, "Forbidden: insufficient permissions");
    }

    next();
  };
};
