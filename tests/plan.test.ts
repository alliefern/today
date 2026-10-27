import { describe, expect, it } from "vitest";
import { buildDay, clearStreak, pickCarryOver, routineRowsToCreate } from "@/lib/plan";
import { SEED_PROJECTS, SEED_ROUTINES, seedOneOffs } from "@/seed/data";
import type { Routine, Task } from "@/lib/types";

// the real seed, as routines
const routines: Routine[] = SEED_ROUTINES.map((s, i) => ({
  id: `r${i}`,
  project_id: s.project,
  title: s.title,
  schedule_type: s.schedule_type,
  weekdays: s.weekdays ?? [],
  day_of_month: null,
  active: true,
  sort: i,
}));

const task = (o: Partial<Task>): Task => ({
  id: "t",
  project_id: null,
  routine_id: null,
  title: "x",
  date: "2026-10-26",
  bonus: false,
  sticky: false,
  done_at: null,
  dismissed_at: null,
  ...o,
});

describe("what lands on each day (the seed schedule)", () => {
  const titles = (date: string) => routineRowsToCreate(date, routines, new Set()).map((r) => r.title);

  it("tuesday oct 27: the 5 dailies + the blog check-in, bonus flagged", () => {
    const rows = routineRowsToCreate("2026-10-27", routines, new Set());
    expect(rows.filter((r) => !r.bonus)).toHaveLength(6);
    expect(titles("2026-10-27")).toContain("alliefern.com blog check-in with the blog assistant");
    expect(rows.filter((r) => r.bonus).map((r) => r.title)).toEqual(["work on the game with Roo"]);
  });

  it("monday gets the premium drop, thursday the coffee & claude check-in, friday the teaser", () => {
    expect(titles("2026-10-26")).toContain("GWD premium drop goes out today");
    expect(titles("2026-10-29")).toContain("coffee & claude blog check-in");
    expect(titles("2026-10-30")).toContain("post the teaser for Monday's premium drop");
  });

  it("sunday schedules a week of drops", () => {
    expect(titles("2026-11-01")).toContain("schedule a week of GWD prompt drops so I stay a month ahead");
  });

  it("never duplicates a routine that already has a row (e.g. a snoozed one)", () => {
    expect(routineRowsToCreate("2026-10-27", routines, new Set(["r0"])).map((r) => r.routine_id)).not.toContain("r0");
  });

  it("skips paused routines", () => {
    const paused = routines.map((r) => (r.id === "r0" ? { ...r, active: false } : r));
    expect(routineRowsToCreate("2026-10-27", paused, new Set()).map((r) => r.routine_id)).not.toContain("r0");
  });
});

describe("seed data", () => {
  it("every routine and one-off points at a real project", () => {
    const keys = new Set(SEED_PROJECTS.map((p) => p.key));
    expect(SEED_ROUTINES.every((r) => keys.has(r.project))).toBe(true);
    expect(seedOneOffs("2026-10-27").every((t) => keys.has(t.project))).toBe(true);
  });

  it("has the 10 projects from the brief, plus fiona", () => {
    expect(SEED_PROJECTS).toHaveLength(11);
    expect(SEED_PROJECTS.at(-1)?.name).toBe("Fiona's website");
  });

  it("fiona's site is pinned until ticked, and the nov 1 batch is a one-off", () => {
    const [batch, fiona] = seedOneOffs("2026-10-27");
    expect(batch.date).toBe("2026-11-01");
    expect(batch.sticky).toBeUndefined();
    expect(fiona.sticky).toBe(true);
  });
});

describe("pickCarryOver", () => {
  const today = "2026-10-27";

  it("offers yesterday's unfinished, non-bonus items", () => {
    const tray = pickCarryOver(
      [task({ id: "a" }), task({ id: "b", done_at: "x" }), task({ id: "c", bonus: true }), task({ id: "d", dismissed_at: "x" })],
      today,
      new Set(),
    );
    expect(tray?.items.map((t) => t.id)).toEqual(["a"]);
  });

  it("leaves out routines that are already back on today's list", () => {
    const tray = pickCarryOver([task({ id: "a", routine_id: "r1" }), task({ id: "b", routine_id: "r9" })], today, new Set(["r1"]));
    expect(tray?.items.map((t) => t.id)).toEqual(["b"]);
  });

  it("leaves out pinned tasks: they already show every day", () => {
    expect(pickCarryOver([task({ sticky: true })], today, new Set())).toBeNull();
  });

  it("only offers the most recent day, so it can't become a backlog", () => {
    const tray = pickCarryOver([task({ id: "old", date: "2026-10-23" }), task({ id: "new", date: "2026-10-25" })], today, new Set());
    expect(tray?.date).toBe("2026-10-25");
    expect(tray?.items.map((t) => t.id)).toEqual(["new"]);
  });

  it("lets anything older than a week lapse", () => {
    expect(pickCarryOver([task({ date: "2026-10-10" })], today, new Set())).toBeNull();
  });

  it("ignores today and the future", () => {
    expect(pickCarryOver([task({ date: today }), task({ date: "2026-10-28" })], today, new Set())).toBeNull();
  });
});

describe("buildDay (week view)", () => {
  it("previews future routine days and includes pinned tasks on every day until done", () => {
    const fiona = task({ id: "fiona", title: "build Fiona's website", sticky: true, date: "2026-10-27" });
    const items = buildDay({ date: "2026-10-30", today: "2026-10-27", routines, tasks: [], stickyOpen: [fiona] });
    expect(items.some((i) => i.title === "post the teaser for Monday's premium drop")).toBe(true);
    expect(items.filter((i) => i.sticky)).toHaveLength(1);
  });

  it("doesn't invent routine rows for days that already happened", () => {
    expect(buildDay({ date: "2026-10-20", today: "2026-10-27", routines, tasks: [], stickyOpen: [] })).toEqual([]);
  });

  it("doesn't show a pinned task before its start date", () => {
    const later = task({ sticky: true, date: "2026-11-05" });
    expect(buildDay({ date: "2026-10-30", today: "2026-10-27", routines: [], tasks: [], stickyOpen: [later] })).toEqual([]);
  });

  it("hides snoozed/dismissed rows", () => {
    const items = buildDay({ date: "2026-10-27", today: "2026-10-27", routines: [], tasks: [task({ date: "2026-10-27", dismissed_at: "x" })], stickyOpen: [] });
    expect(items).toEqual([]);
  });

  it("a snoozed routine row on tomorrow suppresses the duplicate preview", () => {
    const snoozed = task({ id: "s", routine_id: "r0", date: "2026-10-28" });
    const items = buildDay({ date: "2026-10-28", today: "2026-10-27", routines, tasks: [snoozed], stickyOpen: [] });
    expect(items.filter((i) => i.routine_id === "r0")).toHaveLength(1);
  });
});

describe("clearStreak (celebratory only)", () => {
  const day = (date: string, done: boolean) => task({ id: date, date, done_at: done ? "x" : null });

  it("counts consecutive finished days including today", () => {
    expect(clearStreak([day("2026-10-25", true), day("2026-10-26", true), day("2026-10-27", true)], "2026-10-27")).toBe(3);
  });

  it("doesn't count an unfinished today, but keeps yesterday's run", () => {
    expect(clearStreak([day("2026-10-25", true), day("2026-10-26", true), day("2026-10-27", false)], "2026-10-27")).toBe(2);
  });

  it("a gap ends the run, and bonus items never matter", () => {
    const rows = [day("2026-10-24", true), task({ id: "b", date: "2026-10-26", bonus: true }), day("2026-10-27", true)];
    expect(clearStreak(rows, "2026-10-27")).toBe(1);
  });
});
