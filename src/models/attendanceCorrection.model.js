import mongoose from "mongoose";

export const CORRECTION_TYPES = ["Missing Check-in", "Missing Checkout", "Incorrect Check-in", "Incorrect Checkout", "Incorrect Work Mode", "Incorrect Break Duration", "Other"];
export const CORRECTION_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"];

const valuesSchema = new mongoose.Schema({
  checkInAt: Date,
  checkOutAt: Date,
  workMode: String,
  totalBreakMinutes: Number,
  notes: String,
}, { _id: false });

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  requestCode: { type: String, required: true, unique: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  attendanceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "Attendance", default: null },
  attendanceDate: { type: String, required: true },
  requestType: { type: String, enum: CORRECTION_TYPES, required: true },
  currentValues: { type: valuesSchema, default: {} },
  requestedValues: { type: valuesSchema, default: {} },
  reason: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  employeeNotes: { type: String, trim: true, maxlength: 2000 },
  attachment: { type: Object, default: null },
  status: { type: String, enum: CORRECTION_STATUSES, default: "Pending" },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewerComment: { type: String, trim: true, maxlength: 2000 },
  reviewedAt: Date,
  cancelledAt: Date,
}, { timestamps: true });

schema.index({ organizationId: 1, status: 1, createdAt: -1 });
schema.index({ organizationId: 1, employeeId: 1, attendanceDate: 1, requestType: 1 }, { unique: true, partialFilterExpression: { status: "Pending" } });

export const AttendanceCorrection = mongoose.model("AttendanceCorrection", schema);
