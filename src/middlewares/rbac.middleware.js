import { ApiError } from "../utils/ApiError.js";

/**
 * Role Guard
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.name;

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
    const permissions = req.user?.role?.permissions || [];

    if (!permissions.includes(permission)) {
      throw new ApiError(403, "Forbidden: insufficient permissions");
    }

    next();
  };
};