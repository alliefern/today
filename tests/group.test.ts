import { describe, expect, it } from "vitest";
import { groupTasks } from "@/lib/group";
import type { Project, Task } from "@/lib/types";

const p = (id: string, sort: number): Project => ({ id, name: id, color: "#ff6fa8", emoji: "✨", link: null, helper: null, sort });
const t = (o: Partial<Task>): Task => ({ id: "t", project_id: null, routine_id: null, title: "x", date: "2026-10-27", bonus: false, sticky: false, done_at: null, dismissed_at: null, ...o });

describe("groupTasks", () => {
  it("orders groups by project, puts loose ends last, and drops empty projects", () => {
    const groups = groupTasks([t({ id: "1", project_id: "b" }), t({ id: "2" }), t({ id: "3", project_id: "a" })], [p("a", 2), p("b", 1), p("c", 3)], {});
    expect(groups.map((g) => g.project?.id ?? "loose")).toEqual(["b", "a", "loose"]);
  });

  it("keeps pinned first and doesn't reshuffle when something is ticked", () => {
    const open = [
      t({ id: "oneoff", created_at: "2" }),
      t({ id: "routine2", routine_id: "r2" }),
      t({ id: "routine1", routine_id: "r1" }),
      t({ id: "pinned", sticky: true }),
    ].map((x) => ({ ...x, project_id: "a" }));
    const sort = { r1: 1, r2: 2 };
    const before = groupTasks(open, [p("a", 1)], sort)[0].tasks.map((x) => x.id);
    const ticked = open.map((x) => (x.id === "routine1" ? { ...x, done_at: "now" } : x));
    const after = groupTasks(ticked, [p("a", 1)], sort)[0].tasks.map((x) => x.id);
    expect(before).toEqual(["pinned", "routine1", "routine2", "oneoff"]);
    expect(after).toEqual(before);
  });
});
