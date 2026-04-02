import { AuditLog } from "../models/auditLog.model.js";

export const logAudit = async ({
  userId,
  action,
  resource,
  resourceId,
  metadata,
  req,
}) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      resource,
      resourceId,
      metadata,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};