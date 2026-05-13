import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
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
    manager:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        required: false
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

// Prevent duplicate department in same org
departmentSchema.index({ name: 1, organizationId: 1 }, { unique: true });

export const Department = mongoose.model("Department", departmentSchema);