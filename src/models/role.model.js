import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

   permissions: {
    type: [String],
    default: []
  },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true
    },
    isSystem: {
      type: Boolean,
      default: false // for Admin, Super Admin
    }
  },
  {
    timestamps: true
  }
);

roleSchema.index({ name: 1, organizationId: 1 }, { unique: true });
roleSchema.index({ organizationId: 1, createdAt: -1 });

export const Role = mongoose.model('Role', roleSchema);
