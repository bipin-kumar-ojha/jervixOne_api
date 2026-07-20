import mongoose from "mongoose";

const websiteLeadSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },

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

    serviceInterest: {
      type: String,
      trim: true,
    },

    projectBrief: {
      type: String,
      trim: true,
    },

    employeeSize: {
      type: String,
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

websiteLeadSchema.index({ email: 1, organizationName: 1 });
websiteLeadSchema.index({ createdAt: -1 });
websiteLeadSchema.index({ status: 1, createdAt: -1 });

const WebsiteLead = mongoose.model("WebsiteLead", websiteLeadSchema);

export default WebsiteLead;
