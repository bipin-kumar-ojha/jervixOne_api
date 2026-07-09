import mongoose from "mongoose";

const productLeadSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    enquiryType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    organizationName: {
      type: String,
      required: true,
      trim: true,
    },

    organizationSize: {
      type: String,
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

    timeline: {
      type: String,
      trim: true,
    },

    requirement: {
      type: String,
      trim: true,
    },

    serviceInterest: {
      type: String,
      required: true,
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

productLeadSchema.index({ email: 1, productName: 1 });
productLeadSchema.index({ organizationName: 1, productName: 1 });

const ProductLead = mongoose.model("ProductLead", productLeadSchema);

export default ProductLead;
