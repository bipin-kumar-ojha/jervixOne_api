import mongoose from "mongoose";

const auditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
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
    required: true,
  },
  metadata: {
    type: Object,
    default: {},
  },
  ip: String,
  userAgent: String,
}, { timestamps: true });

export const Audit = mongoose.model("Audit", auditSchema);
