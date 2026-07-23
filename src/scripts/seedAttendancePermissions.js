import mongoose from "mongoose";
import dotenv from "dotenv";
import { Permission } from "../models/permission.model.js";
import { PERMISSIONS } from "../constants/permissions.js";

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
const definitions = [
  [PERMISSIONS.ATTENDANCE_VIEW, "View organization attendance"],
  [PERMISSIONS.ATTENDANCE_VIEW_OWN, "View own attendance"],
  [PERMISSIONS.ATTENDANCE_CHECKIN, "Check in"],
  [PERMISSIONS.ATTENDANCE_CHECKOUT, "Check out"],
  [PERMISSIONS.ATTENDANCE_BREAK, "Track breaks"],
  [PERMISSIONS.ATTENDANCE_EDIT, "Manually edit attendance"],
  [PERMISSIONS.ATTENDANCE_EXPORT, "Export attendance"],
  [PERMISSIONS.ATTENDANCE_REQUEST_CORRECTION, "Request attendance corrections"],
  [PERMISSIONS.ATTENDANCE_APPROVE_CORRECTION, "Review attendance corrections"],
];
for (const [key, description] of definitions) {
  await Permission.updateOne({ key, organizationId: null }, { $setOnInsert: { key, module: "attendance", description, organizationId: null } }, { upsert: true });
}
await mongoose.disconnect();
console.log("Attendance permissions seeded");
