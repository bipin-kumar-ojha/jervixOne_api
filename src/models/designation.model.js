import mongoose from "mongoose";

export const DESIGNATION_LEVELS = [
  "Co-Founder",
  "Founder",
  "Junior",
  "Mid",
  "Senior",
  "Lead",
  "Manager",
  "Director",
  "VP",
  "C-Level"
];


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
    level:{
      type: String,
      enum: DESIGNATION_LEVELS,
      default: "Mid"
    },
    // department: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Department",
    //   default: null,
    // },
    salaryMin: {
      type: Number,
      default: 0,
    },
    salaryMax: {
      type: Number,
      default: 0,
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

export const Designation = mongoose.model("Designation", designationSchema);