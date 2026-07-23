const formatterCache = new Map();

const formatter = (timezone) => {
  if (!formatterCache.has(timezone)) {
    try {
      formatterCache.set(timezone, new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "long",
      }));
    } catch {
      formatterCache.set(timezone, new Intl.DateTimeFormat("en-CA", {
        timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "long",
      }));
    }
  }
  return formatterCache.get(timezone);
};

export const getZonedParts = (date = new Date(), timezone = "UTC") => Object.fromEntries(
  formatter(timezone).formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]),
);
export const getAttendanceDate = (date, timezone) => {
  const p = getZonedParts(date, timezone);
  return `${p.year}-${p.month}-${p.day}`;
};
export const getLocalMinutes = (date, timezone) => {
  const p = getZonedParts(date, timezone);
  return Number(p.hour) * 60 + Number(p.minute);
};
export const durationMinutes = (start, end) => {
  const value = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
};
export const totalBreakMinutes = (breaks = []) => breaks.reduce((sum, item) => sum + (item.endedAt ? durationMinutes(item.startedAt, item.endedAt) : 0), 0);
export const calculatePunctuality = (checkIn, settings) => {
  const [hours, minutes] = settings.officeStartTime.split(":").map(Number);
  return getLocalMinutes(checkIn, settings.timezone) <= hours * 60 + minutes + settings.gracePeriodMinutes ? "On Time" : "Late";
};
export const calculateCheckoutStatus = (workingMinutes, punctuality, settings) => {
  if (workingMinutes < settings.halfDayMinimumMinutes) return "Half Day";
  if (workingMinutes < settings.fullDayRequiredMinutes) return "Half Day";
  return punctuality === "Late" ? "Late" : "Present";
};
export const safeIp = (ip = "") => ip.includes(":") ? `${ip.split(":").slice(0, 4).join(":")}::` : ip.replace(/\.\d+$/, ".0");
