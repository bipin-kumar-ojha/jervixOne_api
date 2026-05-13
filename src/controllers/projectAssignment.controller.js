import ProjectAssignment from "../models/projectAssignment.model.js";
import { Employee } from "../models/employee.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const assignProject = asyncHandler(async (req, res) => {
	const { projectId } = req.params;
	const { assignType, employeeIds, departmentId } = req.body;

	let employees = [];

	// Case 1: Direct employees
	if (assignType === "employees") {
		employees = employeeIds;
	}

	// Case 2: Department
	if (assignType === "department") {
		const deptEmployees = await Employee.find({ department: departmentId });
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
			filter: { projectId, employeeId: empId },
			update: {
				$setOnInsert: {
					projectId,
					employeeId: empId,
					assignedBy: req.user._id
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