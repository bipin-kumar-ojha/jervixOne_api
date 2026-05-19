import ProjectAssignment from "../models/projectAssignment.model.js";
import { Employee } from "../models/employee.model.js";
import Project from "../models/project.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const assignProject = asyncHandler(async (req, res) => {
	const { projectId } = req.params;
	const { assignType, employeeIds, departmentId } = req.body;
	const organizationId = req.user.organizationId;

	let employees = [];

	if (!organizationId) {
		throw new ApiError(400, "No organization linked to your account");
	}

	const project = await Project.findOne({ _id: projectId, organizationId });
	if (!project) {
		throw new ApiError(404, "Project not found");
	}

	// Case 1: Direct employees
	if (assignType === "employees") {
		const orgEmployees = await Employee.find({
			_id: { $in: employeeIds || [] },
			organizationId,
		}).select("_id");
		employees = orgEmployees.map(emp => emp._id);
	}

	// Case 2: Department
	if (assignType === "department") {
		const deptEmployees = await Employee.find({ department: departmentId, organizationId });
		employees = deptEmployees.map(emp => emp._id);
	}

	if (!employees.length) {
		throw new ApiError(400, "No employees found for assignment");
	}

	// Remove duplicates (important)
	employees = [...new Set(employees)];

	// Insert assignments (ignore duplicates safely)
	const bulkOps = employees.map(empId => ({
		updateOne: {
			filter: { projectId, employeeId: empId, organizationId },
			update: {
				$setOnInsert: {
					projectId,
					employeeId: empId,
					assignedBy: req.user._id,
					organizationId,
				}
			},
			upsert: true
		}
	}));

	await ProjectAssignment.bulkWrite(bulkOps);

	res.status(201).json({
		success: true,
		message: "Project assigned successfully"
	});
});
