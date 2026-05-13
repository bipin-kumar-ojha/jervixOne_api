import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
	{
		teamName: { type: String, required: true, trim: true },
		department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
		teamLead: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
		members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
		organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
		status: { type: String, enum: ["active", "inactive"], default: "active" },
	},
	{ timestamps: true },
);

export const Team = mongoose.model("Team", teamSchema);
