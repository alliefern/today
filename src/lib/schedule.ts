import { daysInMonth, weekdayOf } from "./dates";
import type { Routine, ScheduleType } from "./types";

export const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
export const WEEKDAY_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const SCHEDULE_LABELS: Record<ScheduleType, string> = {
  daily: "every day",
  weekdays: "certain days",
  weekly: "once a week",
  monthly: "once a month",
  bonus: "someday / bonus",
};

type ScheduleFields = Pick<Routine, "schedule_type" | "weekdays" | "day_of_month">;

/**
 * is this routine on the list for this date?
 * bonus routines are "due" every day: they sit on the bonus list, never the
 * main one, so nothing ever counts as unfinished.
 */
export function isDue(r: ScheduleFields, iso: string): boolean {
  switch (r.schedule_type) {
    case "daily":
    case "bonus":
      return true;
    case "weekdays":
    case "weekly":
      return r.weekdays.includes(weekdayOf(iso));
    case "monthly": {
      if (!r.day_of_month) return false;
      const [y, m, d] = iso.split("-").map(Number);
      // day 31 in a 30-day month means "the last day"
      return d === Math.min(r.day_of_month, daysInMonth(y, m));
    }
  }
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
}

export function describeSchedule(r: ScheduleFields): string {
  const days = [...r.weekdays].sort((a, b) => a - b);
  switch (r.schedule_type) {
    case "daily":
      return "every day";
    case "weekdays":
      if (days.length === 0) return "no days picked";
      if (days.length === 7) return "every day";
      return days.map((d) => WEEKDAY_SHORT[d]).join(", ");
    case "weekly":
      return days.length ? `every ${WEEKDAY_NAMES[days[0]]}` : "no day picked";
    case "monthly":
      return r.day_of_month ? `the ${ordinal(r.day_of_month)} of each month` : "no date picked";
    case "bonus":
      return "bonus · whenever you feel like it";
  }
}

/** validates + normalizes schedule input from a form or api call */
export function normalizeSchedule(input: {
  schedule_type: string;
  weekdays?: number[];
  day_of_month?: number | null;
}): { ok: true; value: ScheduleFields } | { ok: false; error: string } {
  const type = input.schedule_type as ScheduleType;
  if (!(type in SCHEDULE_LABELS)) return { ok: false, error: "pick a schedule" };
  const weekdays = [...new Set(input.weekdays ?? [])].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort((a, b) => a - b);
  if (type === "weekdays" && weekdays.length === 0) return { ok: false, error: "pick at least one day" };
  if (type === "weekly" && weekdays.length === 0) return { ok: false, error: "pick a day" };
  if (type === "monthly") {
    const dom = Number(input.day_of_month);
    if (!Number.isInteger(dom) || dom < 1 || dom > 31) return { ok: false, error: "pick a date from 1 to 31" };
    return { ok: true, value: { schedule_type: type, weekdays: [], day_of_month: dom } };
  }
  if (type === "weekly") return { ok: true, value: { schedule_type: type, weekdays: weekdays.slice(0, 1), day_of_month: null } };
  if (type === "weekdays") return { ok: true, value: { schedule_type: type, weekdays, day_of_month: null } };
  return { ok: true, value: { schedule_type: type, weekdays: [], day_of_month: null } };
}
