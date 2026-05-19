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

    employeeSize: {
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

websiteLeadSchema.index({ email: 1, organizationName: 1 });

const WebsiteLead = mongoose.model("WebsiteLead", websiteLeadSchema);

export default WebsiteLead;
