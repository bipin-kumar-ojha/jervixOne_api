import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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
    isSystem: {
      type: Boolean,
      default: false // for Admin, Super Admin
    }
  },
  {
    timestamps: true
  }
);

export const Role = mongoose.model('Role', roleSchema);