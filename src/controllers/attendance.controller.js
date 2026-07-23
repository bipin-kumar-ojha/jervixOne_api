import { Attendance } from "../models/attendance.model.js";
import { AttendanceCorrection } from "../models/attendanceCorrection.model.js";
import { AttendanceSettings } from "../models/attendanceSettings.model.js";
import { Employee } from "../models/employee.model.js";
import { Team } from "../models/team.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logAudit } from "../services/audit.service.js";
import { calculateCheckoutStatus, calculatePunctuality, durationMinutes, getAttendanceDate, getZonedParts, safeIp, totalBreakMinutes } from "../utils/attendance.util.js";

const DEFAULT_LIMIT = 20;
const ensureOrg = (req) => {
  if (!req.user?.organizationId) throw new ApiError(400, "No organization linked to your account");
  return req.user.organizationId;
};
const hasPermission = (req, permission) => Boolean(req.user?.role?.isSystem || req.user?.role?.permissions?.includes(permission));
const getEmployee = async (req) => {
  const organizationId = ensureOrg(req);
  const employee = await Employee.findOne({ organizationId, $or: [{ officialEmail: req.user.email }, { personalEmail: req.user.email }] });
  if (!employee) throw new ApiError(404, "Employee record not found for the authenticated user");
  return employee;
};
const getSettings = (organizationId) => AttendanceSettings.findOneAndUpdate(
  { organizationId }, { $setOnInsert: { organizationId } }, { new: true, upsert: true, setDefaultsOnInsert: true },
);
const send = (res, message, data, status = 200, extra = {}) => res.status(status).json({ success: true, message, data, ...extra });
const serialize = (record, extras = {}) => {
  const value = record?.toObject ? record.toObject() : { ...record };
  return {
    ...value, checkIn: value.checkInAt ?? null, checkOut: value.checkOutAt ?? null,
    breakMinutes: Number(value.totalBreakMinutes || 0), workingMinutes: Number(value.totalWorkingMinutes || 0),
    punctuality: value.punctualityStatus ?? "Not Applicable", ...extras,
  };
};
const populateRecord = (query) => query.populate({ path: "employeeId", select: "name employeeId officialEmail department", populate: { path: "department", select: "departmentName name" } });
const teamMapFor = async (organizationId, employeeIds) => {
  const teams = await Team.find({ organizationId, $or: [{ members: { $in: employeeIds } }, { teamLead: { $in: employeeIds } }] }).select("teamName members teamLead").lean();
  const map = new Map();
  teams.forEach((team) => [...team.members, team.teamLead].filter(Boolean).forEach((id) => { if (!map.has(String(id))) map.set(String(id), team.teamName); }));
  return map;
};
const recalculate = (record, settings) => {
  record.totalBreakMinutes = totalBreakMinutes(record.breaks);
  if (record.checkInAt && record.checkOutAt) {
    record.totalWorkingMinutes = Math.max(durationMinutes(record.checkInAt, record.checkOutAt) - record.totalBreakMinutes, 0);
    record.punctualityStatus = calculatePunctuality(record.checkInAt, settings);
    record.status = calculateCheckoutStatus(record.totalWorkingMinutes, record.punctualityStatus, settings);
    record.state = "checked-out";
  } else if (record.checkInAt) {
    record.punctualityStatus = calculatePunctuality(record.checkInAt, settings);
    record.status = record.punctualityStatus === "Late" ? "Late" : "Present";
  }
};

export const getSettingsHandler = asyncHandler(async (req, res) => send(res, "Attendance settings loaded successfully", await getSettings(ensureOrg(req))));

export const getMyToday = asyncHandler(async (req, res) => {
  const employee = await getEmployee(req); const settings = await getSettings(ensureOrg(req));
  const record = await Attendance.findOne({ organizationId: ensureOrg(req), employeeId: employee._id, attendanceDate: getAttendanceDate(new Date(), settings.timezone) });
  const data = record ? serialize(record) : { state: "not-checked-in", checkIn: null, checkOut: null, status: "Not Checked In", breaks: [], totalBreakMinutes: 0, totalWorkingMinutes: 0, breakMinutes: 0, workingMinutes: 0 };
  send(res, "Today's attendance loaded successfully", { ...data, serverCurrentTime: new Date().toISOString() });
});

export const checkIn = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const employee = await getEmployee(req); const settings = await getSettings(organizationId); const now = new Date();
  if (!settings.allowedWorkModes.includes(req.body.workMode)) throw new ApiError(400, "Invalid work mode");
  const punctuality = calculatePunctuality(now, settings);
  try {
    const record = await Attendance.create({ organizationId, employeeId: employee._id, attendanceDate: getAttendanceDate(now, settings.timezone), checkInAt: now, state: "working", status: punctuality === "Late" ? "Late" : "Present", punctualityStatus: punctuality, workMode: req.body.workMode, checkInNote: req.body.note, device: req.headers["user-agent"], ipAddress: safeIp(req.ip), source: "web" });
    send(res, "Checked in successfully", serialize(record), 201);
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "You are already checked in for today.");
    throw error;
  }
});

export const startBreak = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const employee = await getEmployee(req); const settings = await getSettings(organizationId); const attendanceDate = getAttendanceDate(new Date(), settings.timezone);
  const record = await Attendance.findOneAndUpdate({ organizationId, employeeId: employee._id, attendanceDate, state: "working" }, { $push: { breaks: { startedAt: new Date(), note: req.body.note } }, $set: { state: "on-break" } }, { new: true, runValidators: true });
  if (!record) throw new ApiError(409, "A break can only be started while working.");
  send(res, "Break started successfully", serialize(record));
});

export const endBreak = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const employee = await getEmployee(req); const settings = await getSettings(organizationId); const attendanceDate = getAttendanceDate(new Date(), settings.timezone); const now = new Date();
  const active = await Attendance.findOne({ organizationId, employeeId: employee._id, attendanceDate, state: "on-break", "breaks.endedAt": null });
  if (!active) throw new ApiError(409, "There is no active break to end.");
  const item = active.breaks.find((entry) => !entry.endedAt); const minutes = durationMinutes(item.startedAt, now);
  const record = await Attendance.findOneAndUpdate({ _id: active._id, organizationId, state: "on-break", "breaks._id": item._id, "breaks.endedAt": null }, { $set: { state: "working", "breaks.$.endedAt": now, "breaks.$.durationMinutes": minutes }, $inc: { totalBreakMinutes: minutes } }, { new: true, runValidators: true });
  if (!record) throw new ApiError(409, "There is no active break to end.");
  send(res, "Break ended successfully", serialize(record));
});

export const checkOut = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const employee = await getEmployee(req); const settings = await getSettings(organizationId); const attendanceDate = getAttendanceDate(new Date(), settings.timezone); const now = new Date();
  const current = await Attendance.findOne({ organizationId, employeeId: employee._id, attendanceDate });
  if (!current?.checkInAt) throw new ApiError(409, "You must check in before checking out.");
  if (current.state === "on-break") throw new ApiError(409, "End the active break before checking out.");
  if (current.state !== "working") throw new ApiError(409, "You are already checked out for today.");
  const breaks = totalBreakMinutes(current.breaks); const working = Math.max(durationMinutes(current.checkInAt, now) - breaks, 0);
  const record = await Attendance.findOneAndUpdate({ _id: current._id, organizationId, state: "working" }, { $set: { checkOutAt: now, checkOutNote: req.body.note, state: "checked-out", totalBreakMinutes: breaks, totalWorkingMinutes: working, status: calculateCheckoutStatus(working, current.punctualityStatus, settings) } }, { new: true, runValidators: true });
  if (!record) throw new ApiError(409, "Attendance state changed; please refresh and try again.");
  send(res, "Checked out successfully", serialize(record));
});

const buildOrgFilter = async (req, attendanceDate) => {
  const organizationId = ensureOrg(req); const filter = { organizationId };
  if (attendanceDate) filter.attendanceDate = attendanceDate;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.workMode) filter.workMode = req.query.workMode;
  if (req.query.departmentId || req.query.search) {
    const employeeFilter = { organizationId };
    if (req.query.departmentId) employeeFilter.department = req.query.departmentId;
    if (req.query.search) employeeFilter.$or = [{ name: { $regex: req.query.search, $options: "i" } }, { employeeId: { $regex: req.query.search, $options: "i" } }];
    filter.employeeId = { $in: await Employee.find(employeeFilter).distinct("_id") };
  }
  if (req.query.teamId) {
    const team = await Team.findOne({ _id: req.query.teamId, organizationId }).select("members teamLead");
    filter.employeeId = { $in: team ? [...team.members, team.teamLead].filter(Boolean) : [] };
  }
  return filter;
};

export const summary = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const settings = await getSettings(organizationId); const date = req.query.date || getAttendanceDate(new Date(), settings.timezone); const filter = await buildOrgFilter(req, date);
  const employeeFilter = { organizationId, status: "active" };
  if (req.query.departmentId) employeeFilter.department = req.query.departmentId;
  const [totalEmployees, stats] = await Promise.all([Employee.countDocuments(employeeFilter), Attendance.aggregate([{ $match: filter }, { $group: { _id: null, present: { $sum: { $cond: [{ $in: ["$status", ["Present", "Late"]] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } }, late: { $sum: { $cond: [{ $eq: ["$punctualityStatus", "Late"] }, 1, 0] } }, leave: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } }, remote: { $sum: { $cond: [{ $ne: ["$workMode", "Office"] }, 1, 0] } } } }])]);
  const s = stats[0] || {}; send(res, "Attendance summary loaded successfully", { totalEmployees, presentToday: s.present || 0, absentToday: s.absent || 0, lateToday: s.late || 0, onLeave: s.leave || 0, workingRemotely: s.remote || 0 });
});

export const list = asyncHandler(async (req, res) => {
  const settings = await getSettings(ensureOrg(req)); const filter = await buildOrgFilter(req, req.query.date || getAttendanceDate(new Date(), settings.timezone)); const page = Number(req.query.page || 1); const limit = Number(req.query.limit || DEFAULT_LIMIT);
  const sortMap = { employee: "employeeId", checkIn: "checkInAt", workingHours: "totalWorkingMinutes" }; const sort = { [sortMap[req.query.sortBy] || "checkInAt"]: req.query.sortDirection === "asc" ? 1 : -1 };
  const [records, total] = await Promise.all([populateRecord(Attendance.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)), Attendance.countDocuments(filter)]); const teams = await teamMapFor(ensureOrg(req), records.map((r) => r.employeeId?._id));
  const data = records.map((record) => serialize(record, { employee: record.employeeId ? { id: record.employeeId._id, employeeId: record.employeeId.employeeId, name: record.employeeId.name, department: record.employeeId.department?.departmentName || record.employeeId.department?.name || null, team: teams.get(String(record.employeeId._id)) || null } : null }));
  send(res, "Attendance loaded successfully", data, 200, { pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getById = asyncHandler(async (req, res) => {
  const record = await populateRecord(Attendance.findOne({ _id: req.params.id, organizationId: ensureOrg(req) }).populate("updatedBy", "name email"));
  if (!record) throw new ApiError(404, "Attendance record not found");
  const activity = await AuditLog.find({ organizationId: ensureOrg(req), $or: [{ resource: "Attendance", resourceId: record._id }, { "metadata.attendanceId": record._id }] }).select("action metadata user createdAt").populate("user", "name email").sort({ createdAt: -1 }).lean();
  send(res, "Attendance details loaded successfully", serialize(record, { maskedIpAddress: safeIp(record.ipAddress), activity }));
});

export const update = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const record = await Attendance.findOne({ _id: req.params.id, organizationId });
  if (!record) throw new ApiError(404, "Attendance record not found");
  const employee = await Employee.findOne({
    organizationId,
    $or: [{ officialEmail: req.user.email }, { personalEmail: req.user.email }],
  }).select("_id");
  const isOwnAttendance = employee && String(employee._id) === String(record.employeeId);

  // Employees must never be able to make their own attendance effective through
  // the general edit endpoint. Their proposed values stay isolated in a pending
  // correction until a user with the approval permission reviews the request.
  if (isOwnAttendance) {
    if (!hasPermission(req, "attendance.request_correction")) {
      throw new ApiError(403, "You do not have permission to request an attendance correction");
    }
    const requestedValues = {};
    ["checkInAt", "checkOutAt", "workMode", "notes", "totalBreakMinutes"].forEach((key) => {
      if (req.body[key] !== undefined) requestedValues[key] = req.body[key];
    });
    if (!Object.keys(requestedValues).length) throw new ApiError(422, "At least one attendance value must be changed");
    if (requestedValues.checkInAt && requestedValues.checkOutAt && new Date(requestedValues.checkOutAt) < new Date(requestedValues.checkInAt)) {
      throw new ApiError(422, "Checkout cannot be before check-in");
    }
    try {
      const request = await AttendanceCorrection.create({
        organizationId,
        requestCode: correctionCode(),
        employeeId: employee._id,
        attendanceRecordId: record._id,
        attendanceDate: record.attendanceDate,
        requestType: "Other",
        currentValues: {
          checkInAt: record.checkInAt, checkOutAt: record.checkOutAt, workMode: record.workMode,
          totalBreakMinutes: record.totalBreakMinutes, notes: record.notes,
        },
        requestedValues,
        reason: req.body.manualUpdateReason,
      });
      await logAudit({ userId: req.user._id, organizationId, action: "attendance.correction_requested", resource: "AttendanceCorrection", resourceId: request._id, metadata: { attendanceId: record._id }, req });
      return send(res, "Attendance correction submitted and is waiting for approval", request, 202);
    } catch (error) {
      if (error?.code === 11000) throw new ApiError(409, "A pending correction request already exists.");
      throw error;
    }
  }

  if (!hasPermission(req, "attendance.edit")) throw new ApiError(403, "Forbidden: insufficient permissions");
  ["checkInAt", "checkOutAt", "workMode", "notes", "totalBreakMinutes"].forEach((key) => { if (req.body[key] !== undefined) record[key] = req.body[key]; });
  if (record.checkInAt && record.checkOutAt && new Date(record.checkOutAt) < new Date(record.checkInAt)) throw new ApiError(422, "Checkout cannot be before check-in");
  record.manualUpdateReason = req.body.manualUpdateReason; record.isManualUpdate = true; record.updatedBy = req.user._id; record.source = "manual"; recalculate(record, await getSettings(organizationId)); await record.save();
  await logAudit({ userId: req.user._id, organizationId, action: "attendance.manual_update", resource: "Attendance", resourceId: record._id, metadata: { reason: req.body.manualUpdateReason }, req });
  send(res, "Attendance updated successfully", serialize(record));
});

export const myHistory = asyncHandler(async (req, res) => {
  const employee = await getEmployee(req); const [year, month] = req.query.month.split("-").map(Number); const prefix = `${year}-${String(month).padStart(2, "0")}`; const page = Number(req.query.page || 1); const limit = Number(req.query.limit || 100); const filter = { organizationId: ensureOrg(req), employeeId: employee._id, attendanceDate: { $regex: `^${prefix}` } };
  const [all, history, total] = await Promise.all([Attendance.find(filter).sort({ attendanceDate: 1 }).lean(), Attendance.find(filter).sort({ attendanceDate: -1 }).skip((page - 1) * limit).limit(limit), Attendance.countDocuments(filter)]); const present = all.filter((r) => ["Present", "Late"].includes(r.status)); const working = all.reduce((sum, r) => sum + Number(r.totalWorkingMinutes || 0), 0);
  send(res, "Attendance history loaded successfully", { history: history.map((r) => serialize(r)), calendar: all.map((r) => ({ date: r.attendanceDate, status: r.status })), summary: { presentDays: present.length, absentDays: all.filter((r) => r.status === "Absent").length, leaveDays: all.filter((r) => r.status === "On Leave").length, lateCount: all.filter((r) => r.punctualityStatus === "Late").length, totalWorkingMinutes: working, averageWorkingMinutes: present.length ? Math.round(working / present.length) : 0 } }, 200, { pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const correctionCode = () => `ACR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
const correctionPopulate = (query) => query.populate("employeeId", "name employeeId officialEmail").populate("attendanceRecordId").populate("reviewerId", "name email");

export const listCorrections = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const scope = req.query.scope || "mine"; const filter = { organizationId };
  if (scope === "mine") filter.employeeId = (await getEmployee(req))._id;
  else {
    if (!hasPermission(req, "attendance.approve_correction")) throw new ApiError(403, "Forbidden: insufficient permissions");
    filter.status = scope === "pending" ? "Pending" : { $in: ["Approved", "Rejected", "Cancelled"] };
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const ids = await Employee.find({ organizationId, $or: [{ name: { $regex: req.query.search, $options: "i" } }, { employeeId: { $regex: req.query.search, $options: "i" } }] }).distinct("_id");
    filter.$or = [{ requestCode: { $regex: req.query.search, $options: "i" } }, { employeeId: { $in: ids } }];
  }
  const page = Number(req.query.page || 1); const limit = Number(req.query.limit || DEFAULT_LIMIT);
  const [items, total] = await Promise.all([correctionPopulate(AttendanceCorrection.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)), AttendanceCorrection.countDocuments(filter)]);
  send(res, "Correction requests loaded successfully", items, 200, { pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const timeOnDate = (date, time, timezone) => {
  if (!time) return null;
  // Derive the UTC offset at local noon, then construct the requested organization-local time.
  const noon = new Date(`${date}T12:00:00Z`); const local = getZonedParts(noon, timezone);
  const represented = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute));
  const offset = represented - noon.getTime(); const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(...date.split("-").map((v, i) => i === 1 ? Number(v) - 1 : Number(v)), hour, minute) - offset);
};

export const createCorrection = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const employee = await getEmployee(req); const settings = await getSettings(organizationId); const today = getAttendanceDate(new Date(), settings.timezone);
  if (!settings.allowCorrectionRequests) throw new ApiError(403, "Attendance correction requests are disabled");
  if (req.body.attendanceDate > today) throw new ApiError(422, "Attendance date cannot be in the future");
  const attendance = await Attendance.findOne({ organizationId, employeeId: employee._id, attendanceDate: req.body.attendanceDate });
  const requestedValues = { checkInAt: timeOnDate(req.body.attendanceDate, req.body.requestedCheckIn, settings.timezone), checkOutAt: timeOnDate(req.body.attendanceDate, req.body.requestedCheckOut, settings.timezone), workMode: req.body.requestedWorkMode, totalBreakMinutes: req.body.requestedBreakMinutes, notes: req.body.requestedNotes };
  Object.keys(requestedValues).forEach((key) => requestedValues[key] == null && delete requestedValues[key]);
  try {
    const request = await AttendanceCorrection.create({ organizationId, requestCode: correctionCode(), employeeId: employee._id, attendanceRecordId: attendance?._id, attendanceDate: req.body.attendanceDate, requestType: req.body.type, currentValues: attendance ? { checkInAt: attendance.checkInAt, checkOutAt: attendance.checkOutAt, workMode: attendance.workMode, totalBreakMinutes: attendance.totalBreakMinutes, notes: attendance.notes } : {}, requestedValues, reason: req.body.reason, attachment: req.body.attachmentId ? { id: req.body.attachmentId } : null });
    send(res, "Correction request created successfully", request, 201);
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "A pending correction request already exists.");
    throw error;
  }
});

export const getCorrection = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const request = await correctionPopulate(AttendanceCorrection.findOne({ _id: req.params.id, organizationId }));
  if (!request) throw new ApiError(404, "Correction request not found");
  if (!hasPermission(req, "attendance.approve_correction")) {
    const employee = await getEmployee(req); if (String(request.employeeId?._id) !== String(employee._id)) throw new ApiError(403, "Forbidden");
  }
  send(res, "Correction request loaded successfully", request);
});

export const approveCorrection = asyncHandler(async (req, res) => {
  const organizationId = ensureOrg(req); const request = await AttendanceCorrection.findOneAndUpdate({ _id: req.params.id, organizationId, status: "Pending" }, { $set: { status: "Approved", reviewerId: req.user._id, reviewerComment: req.body.comment, reviewedAt: new Date() } }, { new: true });
  if (!request) throw new ApiError(409, "This correction request has already been reviewed.");
  let attendance = request.attendanceRecordId ? await Attendance.findOne({ _id: request.attendanceRecordId, organizationId, employeeId: request.employeeId }) : null;
  if (!attendance) attendance = new Attendance({ organizationId, employeeId: request.employeeId, attendanceDate: request.attendanceDate });
  Object.entries(request.requestedValues?.toObject?.() || request.requestedValues || {}).forEach(([key, value]) => { if (value != null) attendance[key] = value; });
  attendance.isManualUpdate = true; attendance.updatedBy = req.user._id; attendance.manualUpdateReason = request.reason; attendance.source = "correction"; recalculate(attendance, await getSettings(organizationId));
  try { await attendance.save(); } catch (error) { await AttendanceCorrection.updateOne({ _id: request._id, status: "Approved" }, { $set: { status: "Pending" }, $unset: { reviewerId: 1, reviewerComment: 1, reviewedAt: 1 } }); throw error; }
  await logAudit({ userId: req.user._id, organizationId, action: "attendance.correction_approved", resource: "AttendanceCorrection", resourceId: request._id, metadata: { attendanceId: attendance._id }, req });
  send(res, "Correction request approved successfully", { request, attendance: serialize(attendance) });
});

export const rejectCorrection = asyncHandler(async (req, res) => {
  const request = await AttendanceCorrection.findOneAndUpdate({ _id: req.params.id, organizationId: ensureOrg(req), status: "Pending" }, { $set: { status: "Rejected", reviewerId: req.user._id, reviewerComment: req.body.comment, reviewedAt: new Date() } }, { new: true });
  if (!request) throw new ApiError(409, "This correction request has already been reviewed.");
  await logAudit({ userId: req.user._id, organizationId: ensureOrg(req), action: "attendance.correction_rejected", resource: "AttendanceCorrection", resourceId: request._id, metadata: { comment: req.body.comment }, req }); send(res, "Correction request rejected successfully", request);
});

export const cancelCorrection = asyncHandler(async (req, res) => {
  const employee = await getEmployee(req); const request = await AttendanceCorrection.findOneAndUpdate({ _id: req.params.id, organizationId: ensureOrg(req), employeeId: employee._id, status: "Pending" }, { $set: { status: "Cancelled", cancelledAt: new Date() } }, { new: true });
  if (!request) throw new ApiError(409, "Only your pending correction request can be cancelled."); send(res, "Correction request cancelled successfully", request);
});

const csvCell = (value) => {
  let text = value == null ? "" : String(value); if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
export const exportAttendance = asyncHandler(async (req, res) => {
  const filter = await buildOrgFilter(req, req.query.date); const records = await populateRecord(Attendance.find(filter).sort({ attendanceDate: -1 })); const teams = await teamMapFor(ensureOrg(req), records.map((r) => r.employeeId?._id));
  const header = ["Employee", "Employee ID", "Department", "Team", "Date", "Check-in", "Checkout", "Break minutes", "Working minutes", "Work mode", "Status", "Punctuality"];
  res.setHeader("Content-Type", "text/csv; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename="attendance-${getAttendanceDate(new Date(), "UTC")}.csv"`); res.write(`${header.map(csvCell).join(",")}\n`);
  records.forEach((r) => res.write(`${[r.employeeId?.name, r.employeeId?.employeeId, r.employeeId?.department?.departmentName || r.employeeId?.department?.name, teams.get(String(r.employeeId?._id)), r.attendanceDate, r.checkInAt?.toISOString(), r.checkOutAt?.toISOString(), r.totalBreakMinutes, r.totalWorkingMinutes, r.workMode, r.status, r.punctualityStatus].map(csvCell).join(",")}\n`)); res.end();
});
