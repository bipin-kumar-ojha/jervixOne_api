import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  orgCode: {
    type: String,
    unique: true,
  },

  // The admin user who owns this org
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, // Set after user is created
  },

  plan: {
    type: String,
    enum: ["free", "pro", "enterprise"],
    default: "free",
  },

  subscriptionKey: {
    type: String,
    default: "Free Trial",
    trim: true,
  },

  subscriptionStatus: {
    type: String,
    enum: ["active", "inactive", "expired"],
    default: "inactive", // ← starts inactive until activated
  },

  // Activation code tied to this specific org
  activationCode: {
    type: String,
    default: null,
  },

  activationCodeUsed: {
    type: Boolean,
    default: false,
  },

  expiresAt: {
    type: Date,
    default: null,
  },

}, { timestamps: true });

export default mongoose.model("Organization", organizationSchema);
