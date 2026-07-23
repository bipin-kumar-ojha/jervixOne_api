import assert from "node:assert/strict";
import test from "node:test";
import { calculateCheckoutStatus, durationMinutes, getAttendanceDate, totalBreakMinutes } from "../src/utils/attendance.util.js";

test("organization timezone determines attendance date", () => {
  const instant = new Date("2026-07-01T20:00:00.000Z");
  assert.equal(getAttendanceDate(instant, "Asia/Kolkata"), "2026-07-02");
  assert.equal(getAttendanceDate(instant, "America/New_York"), "2026-07-01");
});

test("duration calculations never return negative or NaN", () => {
  assert.equal(durationMinutes("2026-07-01T10:00:00Z", "2026-07-01T09:00:00Z"), 0);
  assert.equal(durationMinutes("invalid", "invalid"), 0);
});

test("working time excludes completed breaks", () => {
  const breaks = [{ startedAt: "2026-07-01T10:00:00Z", endedAt: "2026-07-01T10:30:00Z" }, { startedAt: "2026-07-01T11:00:00Z", endedAt: null }];
  assert.equal(totalBreakMinutes(breaks), 30);
  assert.equal(durationMinutes("2026-07-01T09:00:00Z", "2026-07-01T18:00:00Z") - totalBreakMinutes(breaks), 510);
});

test("checkout calculation distinguishes half and full days", () => {
  const settings = { halfDayMinimumMinutes: 240, fullDayRequiredMinutes: 480 };
  assert.equal(calculateCheckoutStatus(239, "On Time", settings), "Half Day");
  assert.equal(calculateCheckoutStatus(479, "On Time", settings), "Half Day");
  assert.equal(calculateCheckoutStatus(480, "On Time", settings), "Present");
  assert.equal(calculateCheckoutStatus(480, "Late", settings), "Late");
});

test("attendance models declare tenant-safe uniqueness indexes", async () => {
  const { Attendance } = await import("../src/models/attendance.model.js");
  const { AttendanceCorrection } = await import("../src/models/attendanceCorrection.model.js");
  const attendanceIndex = Attendance.schema.indexes().find(([keys]) => keys.organizationId && keys.employeeId && keys.attendanceDate);
  const correctionIndex = AttendanceCorrection.schema.indexes().find(([, options]) => options.partialFilterExpression?.status === "Pending");
  assert.equal(attendanceIndex[1].unique, true);
  assert.equal(correctionIndex[1].unique, true);
});
