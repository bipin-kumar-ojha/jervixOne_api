import mongoose from "mongoose";

const candidateLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    currentStatus: {
      type: String,
      trim: true,
    },

    portfolio: {
      type: String,
      trim: true,
    },

    skills: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    projectBrief: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["new", "contacted", "converted", "closed"],
      default: "new",
    },
  },
  {
    timestamps: true,
  },
);

candidateLeadSchema.index({ email: 1, role: 1 });

const CandidateLead = mongoose.model("CandidateLead", candidateLeadSchema);

export default CandidateLead;
