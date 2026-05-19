import mongoose from "mongoose";

const projectAssignmentSchema = new mongoose.Schema({
	projectId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Project",
		required: true,
	},

	employeeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Employee",
		required: true,
	},

	role: {
		type: String, // backend, frontend, designer etc
		default: null,
	},

	assignedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
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

// Prevent duplicate assignment (same employee in same project)
projectAssignmentSchema.index({ projectId: 1, employeeId: 1, organizationId: 1 }, { unique: true });

const ProjectAssignment = mongoose.model("ProjectAssignment", projectAssignmentSchema);
export default ProjectAssignment;
