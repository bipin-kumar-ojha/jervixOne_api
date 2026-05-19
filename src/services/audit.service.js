import { AuditLog } from "../models/auditLog.model.js";

export const logAudit = async ({
  userId,
  organizationId,
  action,
  resource,
  resourceId,
  metadata,
  req,
}) => {
  try {
    await AuditLog.create({
      user: userId,
      organizationId: organizationId ?? req?.user?.organizationId ?? null,
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
