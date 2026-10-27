import { describe, expect, it } from "vitest";
import { addDays, diffDays, formatLong, isIsoDate, startOfWeek, todayIn, weekDates, weekdayOf } from "@/lib/dates";

describe("dates", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("knows the weekday (nov 1, 2026 is a sunday)", () => {
    expect(weekdayOf("2026-11-01")).toBe(0);
    expect(weekdayOf("2026-10-27")).toBe(2);
  });

  it("diffs whole days", () => {
    expect(diffDays("2026-10-27", "2026-11-17")).toBe(21);
    expect(diffDays("2026-11-17", "2026-10-27")).toBe(-21);
  });

  it("finds the start of the week for either convention", () => {
    expect(startOfWeek("2026-10-27", 1)).toBe("2026-10-26"); // monday start
    expect(startOfWeek("2026-10-27", 0)).toBe("2026-10-25"); // sunday start
    expect(startOfWeek("2026-11-01", 1)).toBe("2026-10-26"); // a sunday belongs to the week before
    expect(weekDates("2026-10-27", 1)).toHaveLength(7);
  });

  it("validates iso dates strictly", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("2026-11-01")).toBe(true);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it("works out 'today' in the user's time zone, not the server's", () => {
    // 11:30pm on oct 27 in new york is already oct 28 in london
    const instant = new Date("2026-10-28T03:30:00Z");
    expect(todayIn("America/New_York", instant)).toBe("2026-10-27");
    expect(todayIn("Europe/London", instant)).toBe("2026-10-28");
  });

  it("handles the clocks going back in london (oct 25, 2026)", () => {
    expect(todayIn("Europe/London", new Date("2026-10-25T00:30:00Z"))).toBe("2026-10-25");
    expect(todayIn("Europe/London", new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-25");
    expect(todayIn("Europe/London", new Date("2026-10-26T00:00:00Z"))).toBe("2026-10-26");
  });

  it("formats in lowercase, american order", () => {
    expect(formatLong("2026-10-27")).toBe("tuesday, october 27");
  });
});
