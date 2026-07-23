import express from "express";
import { body, param, query } from "express-validator";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireAnyPermission, requirePermission } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { ATTENDANCE_STATUSES, WORK_MODES } from "../models/attendance.model.js";
import { CORRECTION_STATUSES, CORRECTION_TYPES } from "../models/attendanceCorrection.model.js";
import * as controller from "../controllers/attendance.controller.js";

const router = express.Router();
router.use(authMiddleware);
const date = (field) => query(field).optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`Invalid ${field}`);
const pagination = [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })];
const filters = [date("date"), query("departmentId").optional().isMongoId(), query("teamId").optional().isMongoId(), query("status").optional().isIn(ATTENDANCE_STATUSES), query("workMode").optional().isIn(WORK_MODES)];
const id = [param("id").isMongoId().withMessage("Invalid ID")];

router.get("/summary", requirePermission(PERMISSIONS.ATTENDANCE_VIEW), filters, validateRequest, controller.summary);
router.get("/export", requirePermission(PERMISSIONS.ATTENDANCE_EXPORT), filters, query("search").optional().trim().isLength({ max: 100 }), validateRequest, controller.exportAttendance);
router.get("/settings", requireAnyPermission(PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_VIEW_OWN), controller.getSettingsHandler);
router.get("/my/today", requirePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN), controller.getMyToday);
router.post("/my/check-in", requirePermission(PERMISSIONS.ATTENDANCE_CHECKIN), body("workMode").isIn(WORK_MODES), body("note").optional().isString().isLength({ max: 500 }), validateRequest, controller.checkIn);
router.post("/my/breaks/start", requirePermission(PERMISSIONS.ATTENDANCE_BREAK), body("note").optional().isString().isLength({ max: 500 }), validateRequest, controller.startBreak);
router.post("/my/breaks/end", requirePermission(PERMISSIONS.ATTENDANCE_BREAK), controller.endBreak);
router.post("/my/check-out", requirePermission(PERMISSIONS.ATTENDANCE_CHECKOUT), body("note").optional().isString().isLength({ max: 2000 }), validateRequest, controller.checkOut);
router.get("/my/history", requirePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN), query("month").matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage("Month must use YYYY-MM"), ...pagination, validateRequest, controller.myHistory);

router.get("/corrections", requireAnyPermission(PERMISSIONS.ATTENDANCE_REQUEST_CORRECTION, PERMISSIONS.ATTENDANCE_APPROVE_CORRECTION), query("scope").optional().isIn(["mine", "pending", "reviewed"]), query("status").optional().isIn(CORRECTION_STATUSES), query("search").optional().trim().isLength({ max: 100 }), ...pagination, validateRequest, controller.listCorrections);
router.post("/corrections", requirePermission(PERMISSIONS.ATTENDANCE_REQUEST_CORRECTION), body("attendanceDate").matches(/^\d{4}-\d{2}-\d{2}$/), body("type").isIn(CORRECTION_TYPES), body("requestedCheckIn").optional({ nullable: true }).matches(/^([01]\d|2[0-3]):[0-5]\d$/), body("requestedCheckOut").optional({ nullable: true }).matches(/^([01]\d|2[0-3]):[0-5]\d$/), body("requestedWorkMode").optional({ nullable: true }).isIn(WORK_MODES), body("requestedBreakMinutes").optional({ nullable: true }).isInt({ min: 0, max: 1440 }), body("requestedNotes").optional({ nullable: true }).isString().isLength({ max: 2000 }), body("reason").trim().isLength({ min: 10, max: 2000 }), body("attachmentId").optional({ nullable: true }).isMongoId(), body().custom((payload) => {
  const required = { "Missing Check-in": "requestedCheckIn", "Missing Checkout": "requestedCheckOut", "Incorrect Check-in": "requestedCheckIn", "Incorrect Checkout": "requestedCheckOut", "Incorrect Work Mode": "requestedWorkMode", "Incorrect Break Duration": "requestedBreakMinutes", Other: "requestedNotes" };
  const field = required[payload.type]; if (field && (payload[field] === undefined || payload[field] === null || payload[field] === "")) throw new Error(`${field} is required for ${payload.type}`); return true;
}), validateRequest, controller.createCorrection);
router.get("/corrections/:id", requireAnyPermission(PERMISSIONS.ATTENDANCE_REQUEST_CORRECTION, PERMISSIONS.ATTENDANCE_APPROVE_CORRECTION), ...id, validateRequest, controller.getCorrection);
router.post("/corrections/:id/approve", requirePermission(PERMISSIONS.ATTENDANCE_APPROVE_CORRECTION), ...id, body("comment").optional().isString().isLength({ max: 2000 }), validateRequest, controller.approveCorrection);
router.post("/corrections/:id/reject", requirePermission(PERMISSIONS.ATTENDANCE_APPROVE_CORRECTION), ...id, body("comment").trim().isLength({ min: 1, max: 2000 }).withMessage("A reviewer comment is required when rejecting."), validateRequest, controller.rejectCorrection);
router.post("/corrections/:id/cancel", requirePermission(PERMISSIONS.ATTENDANCE_REQUEST_CORRECTION), ...id, validateRequest, controller.cancelCorrection);

router.get("/", requirePermission(PERMISSIONS.ATTENDANCE_VIEW), ...filters, query("search").optional().trim().isLength({ max: 100 }), query("sortBy").optional().isIn(["employee", "checkIn", "workingHours"]), query("sortDirection").optional().isIn(["asc", "desc"]), ...pagination, validateRequest, controller.list);
router.get("/:id", requirePermission(PERMISSIONS.ATTENDANCE_VIEW), ...id, validateRequest, controller.getById);
router.patch("/:id", requireAnyPermission(PERMISSIONS.ATTENDANCE_EDIT, PERMISSIONS.ATTENDANCE_REQUEST_CORRECTION), ...id, body("manualUpdateReason").trim().isLength({ min: 10, max: 1000 }), body("checkInAt").optional().isISO8601(), body("checkOutAt").optional({ nullable: true }).isISO8601(), body("workMode").optional().isIn(WORK_MODES), body("notes").optional().isString().isLength({ max: 2000 }), body("totalBreakMinutes").optional().isInt({ min: 0, max: 1440 }), validateRequest, controller.update);

export default router;
