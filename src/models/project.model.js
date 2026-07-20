import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
	projectName: {
		type: String,
		required: true,
		trim: true,
	},
	startDate: {
		type: Date,
		required: true,
	},
	deliveryDate: {
		type: Date,
		required: true,
	},
	description: {
		type: String,
		required: true,
		trim: true,
	},
	budget: {
		type: Number,
		required: true,
		min: 0,
	},
	currency: {
		type: String,
		enum: ["INR", "USD"],
		default: "INR",
		required: true,
	},
	status: {
		type: String,
		required: true,
		enum: ["planning", "pending", "active", "completed", "on-hold", "cancelled"],
		default: 'pending',
	},
	priority: {
		type: String,
		required: true,
		enum: ['low', 'medium', 'high', 'critical'],
		default: 'medium',
	},
	techStacks: {
		type: [String],
		required: true,
		default: [],
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

projectSchema.post(["init", "save"], function (doc) {
	if (!doc.currency) {
		doc.currency = "INR";
	}
});

projectSchema.index({ organizationId: 1, createdAt: -1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
