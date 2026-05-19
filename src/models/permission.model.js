import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true
  },
  module: String,
  description: String,
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null,
    index: true,
  },
});

permissionSchema.index({ key: 1, organizationId: 1 }, { unique: true });

export const Permission = mongoose.model("Permission", permissionSchema);
