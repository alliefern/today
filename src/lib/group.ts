import type { Project, Task } from "./types";

export interface Group {
  project: Project | null; // null = tasks with no project
  tasks: Task[];
}

/** shown for tasks that don't belong to any project */
export const LOOSE_ENDS: Project = {
  id: "loose",
  name: "loose ends",
  color: "#A78BFA",
  emoji: "🫧",
  link: null,
  helper: null,
  sort: Number.MAX_SAFE_INTEGER,
};

/**
 * groups a day's tasks by project, in project order. inside a group the order
 * never changes when you tick things off: pinned first, then routines in their
 * own order, then one-offs in the order they were added.
 */
export function groupTasks(tasks: Task[], projects: Project[], routineSort: Record<string, number>): Group[] {
  const rank = (t: Task) => (t.sticky ? 0 : t.routine_id ? 1 : 2);
  const cmp = (a: Task, b: Task) =>
    rank(a) - rank(b) ||
    (routineSort[a.routine_id ?? ""] ?? 0) - (routineSort[b.routine_id ?? ""] ?? 0) ||
    (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
    a.title.localeCompare(b.title);

  const byProject = new Map<string | null, Task[]>();
  for (const t of tasks) {
    const key = t.project_id && projects.some((p) => p.id === t.project_id) ? t.project_id : null;
    byProject.set(key, [...(byProject.get(key) ?? []), t]);
  }
  const groups: Group[] = [...projects]
    .sort((a, b) => a.sort - b.sort)
    .filter((p) => byProject.has(p.id))
    .map((p) => ({ project: p, tasks: byProject.get(p.id)!.sort(cmp) }));
  if (byProject.has(null)) groups.push({ project: null, tasks: byProject.get(null)!.sort(cmp) });
  return groups;
}
