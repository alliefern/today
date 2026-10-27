import { describe, expect, it } from "vitest";
import { describeSchedule, isDue, normalizeSchedule } from "@/lib/schedule";

const r = (o: Partial<Parameters<typeof isDue>[0]>) => ({ schedule_type: "daily" as const, weekdays: [], day_of_month: null, ...o });

describe("isDue", () => {
  it("daily is always due", () => {
    expect(isDue(r({}), "2026-10-27")).toBe(true);
  });

  it("weekly lands only on its day (monday, tuesday, thursday, friday, sunday from the seed)", () => {
    const monday = r({ schedule_type: "weekly", weekdays: [1] });
    expect(isDue(monday, "2026-10-26")).toBe(true);
    expect(isDue(monday, "2026-10-27")).toBe(false);
    const sunday = r({ schedule_type: "weekly", weekdays: [0] });
    expect(isDue(sunday, "2026-11-01")).toBe(true);
  });

  it("certain weekdays", () => {
    const mwf = r({ schedule_type: "weekdays", weekdays: [1, 3, 5] });
    expect(["2026-10-26", "2026-10-28", "2026-10-30"].every((d) => isDue(mwf, d))).toBe(true);
    expect(isDue(mwf, "2026-10-27")).toBe(false);
  });

  it("monthly clamps to the last day of short months", () => {
    const the31st = r({ schedule_type: "monthly", day_of_month: 31 });
    expect(isDue(the31st, "2026-10-31")).toBe(true);
    expect(isDue(the31st, "2026-11-30")).toBe(true); // november has 30 days
    expect(isDue(the31st, "2026-11-29")).toBe(false);
    expect(isDue(the31st, "2027-02-28")).toBe(true);
    const the1st = r({ schedule_type: "monthly", day_of_month: 1 });
    expect(isDue(the1st, "2026-11-01")).toBe(true);
    expect(isDue(the1st, "2026-11-02")).toBe(false);
  });

  it("monthly without a date is never due (instead of every day)", () => {
    expect(isDue(r({ schedule_type: "monthly", day_of_month: null }), "2026-10-27")).toBe(false);
  });
});

describe("describeSchedule", () => {
  it("reads naturally", () => {
    expect(describeSchedule(r({}))).toBe("every day");
    expect(describeSchedule(r({ schedule_type: "weekly", weekdays: [2] }))).toBe("every tuesday");
    expect(describeSchedule(r({ schedule_type: "weekdays", weekdays: [5, 1] }))).toBe("mon, fri");
    expect(describeSchedule(r({ schedule_type: "monthly", day_of_month: 22 }))).toBe("the 22nd of each month");
    expect(describeSchedule(r({ schedule_type: "monthly", day_of_month: 11 }))).toBe("the 11th of each month");
  });
});

describe("normalizeSchedule", () => {
  it("rejects incomplete input", () => {
    expect(normalizeSchedule({ schedule_type: "weekdays", weekdays: [] }).ok).toBe(false);
    expect(normalizeSchedule({ schedule_type: "monthly", day_of_month: 40 }).ok).toBe(false);
    expect(normalizeSchedule({ schedule_type: "someday" }).ok).toBe(false);
  });

  it("cleans what it accepts", () => {
    const weekly = normalizeSchedule({ schedule_type: "weekly", weekdays: [3, 3, 9, 1] });
    expect(weekly).toEqual({ ok: true, value: { schedule_type: "weekly", weekdays: [1], day_of_month: null } });
    const daily = normalizeSchedule({ schedule_type: "daily", weekdays: [1], day_of_month: 4 });
    expect(daily).toEqual({ ok: true, value: { schedule_type: "daily", weekdays: [], day_of_month: null } });
  });
});
