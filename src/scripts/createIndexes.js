import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";

import "../models/activationCode.model.js";
import "../models/audit.model.js";
import "../models/auditLog.model.js";
import "../models/candidateLead.model.js";
import "../models/department.model.js";
import "../models/designation.model.js";
import "../models/employee.model.js";
import "../models/organization.model.js";
import "../models/permission.model.js";
import "../models/productLead.model.js";
import "../models/project.model.js";
import "../models/projectAssignment.model.js";
import "../models/role.model.js";
import "../models/task.model.js";
import "../models/team.model.js";
import "../models/user.model.js";
import "../models/websiteLead.model.js";
import "../models/attendance.model.js";
import "../models/attendanceCorrection.model.js";
import "../models/attendanceSettings.model.js";

const createIndexes = async () => {
  await connectDatabase();

  try {
    for (const modelName of mongoose.modelNames()) {
      await mongoose.model(modelName).createIndexes();
      console.log(`Indexes created for ${modelName}`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

createIndexes().catch((error) => {
  console.error("Index creation failed:", error.message);
  process.exitCode = 1;
});
