import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },

    action: {
      type: String,
      required: true,
    },

    resource: {
      type: String,
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    metadata: {
      type: Object,
    },

    ip: String,

    userAgent: String,
  },
  {
    timestamps: true,
  }
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
