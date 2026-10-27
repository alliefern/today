/**
 * all dates in this app are plain "yyyy-mm-dd" strings in the user's own time
 * zone. we never store a time of day, so there is nothing to convert except
 * working out what "today" means right now.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function todayIn(tz: string, now: Date = new Date()): string {
  // en-CA formats as yyyy-mm-dd
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function hourIn(tz: string, now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(h) % 24;
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

function toUtc(iso: string): Date {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const dt = toUtc(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
}

/** whole days from a to b (b - a) */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** 0 = sunday ... 6 = saturday */
export function weekdayOf(iso: string): number {
  return toUtc(iso).getUTCDay();
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

export function startOfWeek(iso: string, weekStart: number): string {
  const back = (weekdayOf(iso) - weekStart + 7) % 7;
  return addDays(iso, -back);
}

export function weekDates(iso: string, weekStart: number): string[] {
  const first = startOfWeek(iso, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

const fmt = (opts: Intl.DateTimeFormatOptions) => (iso: string) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(toUtc(iso)).toLowerCase();

/** "tuesday, october 27" */
export const formatLong = fmt({ weekday: "long", month: "long", day: "numeric" });
/** "october 27" */
export const formatMonthDay = fmt({ month: "long", day: "numeric" });
/** "october 27, 2026" */
export const formatFull = fmt({ month: "long", day: "numeric", year: "numeric" });
/** "tuesday" */
export const formatWeekday = fmt({ weekday: "long" });
/** "tue" */
export const formatWeekdayShort = fmt({ weekday: "short" });
