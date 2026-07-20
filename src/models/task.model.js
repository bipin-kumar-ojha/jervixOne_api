import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
    index: true,
  },

  taskCode: {
    type: String,
    unique: true,
  },

  title: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    trim: true,
    default: "",
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    index: true,
  },

  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },

  estimatedHours: {
    type: Number,
    min: 1,
    default: null,
  },

  actualHours: {
    type: Number,
    default: 0,
  },

  dueDate: {
    type: Date,
    required: true,
  },

  startedAt: {
    type: Date,
    default: null,
  },

  completedAt: {
    type: Date,
    default: null,
  },

  status: {
    type: String,
    enum: [
      "assigned",
      "in-progress",
      "paused",
      "completed",
      "blocked"
    ],
    default: "assigned",
  },

  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
}, {
	timestamps: true,
});

taskSchema.index({ organizationId: 1, createdAt: -1 });
taskSchema.index({ organizationId: 1, projectId: 1, createdAt: -1 });
taskSchema.index({ organizationId: 1, assignedTo: 1, createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

export default Task;
