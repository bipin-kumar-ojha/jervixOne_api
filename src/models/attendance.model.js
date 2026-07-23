import mongoose from "mongoose";

export const ATTENDANCE_STATES = ["not-checked-in", "working", "on-break", "checked-out"];
export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Half Day", "On Leave", "Weekly Off", "Holiday", "Missing Checkout"];
export const PUNCTUALITY_STATUSES = ["On Time", "Late", "Not Applicable"];
export const WORK_MODES = ["Office", "Work From Home", "Remote", "Client Location"];

const breakSchema = new mongoose.Schema({
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  durationMinutes: { type: Number, default: 0, min: 0 },
  note: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  attendanceDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  checkInAt: { type: Date, default: null },
  checkOutAt: { type: Date, default: null },
  state: { type: String, enum: ATTENDANCE_STATES, default: "not-checked-in" },
  status: { type: String, enum: ATTENDANCE_STATUSES, default: "Present" },
  punctualityStatus: { type: String, enum: PUNCTUALITY_STATUSES, default: "Not Applicable" },
  workMode: { type: String, enum: WORK_MODES, default: "Office" },
  breaks: { type: [breakSchema], default: [] },
  totalBreakMinutes: { type: Number, default: 0, min: 0 },
  totalWorkingMinutes: { type: Number, default: 0, min: 0 },
  notes: { type: String, trim: true, maxlength: 2000 },
  checkInNote: { type: String, trim: true, maxlength: 500 },
  checkOutNote: { type: String, trim: true, maxlength: 2000 },
  device: { type: String, trim: true, maxlength: 500 },
  ipAddress: { type: String, trim: true },
  location: { type: Object, default: null },
  isManualUpdate: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  manualUpdateReason: { type: String, trim: true, maxlength: 1000 },
  source: { type: String, enum: ["web", "mobile", "manual", "correction"], default: "web" },
}, { timestamps: true, optimisticConcurrency: true });

attendanceSchema.index({ organizationId: 1, employeeId: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ organizationId: 1, attendanceDate: 1 });
attendanceSchema.index({ organizationId: 1, status: 1, attendanceDate: 1 });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
