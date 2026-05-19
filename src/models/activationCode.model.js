import mongoose from "mongoose";

const activationCodeSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null,
    index: true,
  },

  plan: {
    type: String,
    enum: ["free", "pro", "enterprise"]
  },

  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },

  validTill: Date,
  isActive: { type: Boolean, default: true }

}, { timestamps: true });

export const ActivationCode = mongoose.model("ActivationCode", activationCodeSchema);
