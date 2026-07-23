import mongoose from "mongoose";
import { WORK_MODES } from "./attendance.model.js";

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
  officeStartTime: { type: String, default: "09:30" },
  officeEndTime: { type: String, default: "18:30" },
  timezone: { type: String, default: "Asia/Kolkata" },
  gracePeriodMinutes: { type: Number, default: 10, min: 0 },
  fullDayRequiredMinutes: { type: Number, default: 480, min: 1 },
  halfDayMinimumMinutes: { type: Number, default: 240, min: 1 },
  workingDays: { type: [String], default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
  weeklyOffs: { type: [String], default: ["Saturday", "Sunday"] },
  allowedWorkModes: { type: [String], enum: WORK_MODES, default: WORK_MODES },
  maximumBreakMinutes: { type: Number, default: 60, min: 0 },
  allowCorrectionRequests: { type: Boolean, default: true },
  missingCheckoutPolicy: { type: String, default: "mark-missing" },
  autoMarkAbsent: { type: Boolean, default: false },
}, { timestamps: true });

export const AttendanceSettings = mongoose.model("AttendanceSettings", schema);
