import mongoose from "mongoose";

const designationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate designation in same org
designationSchema.index({ name: 1, organizationId: 1 }, { unique: true });
designationSchema.index({ organizationId: 1, createdAt: -1 });

export const Designation = mongoose.model("Designation", designationSchema);
