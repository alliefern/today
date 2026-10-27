import { addDays, diffDays } from "./dates";
import { isDue } from "./schedule";
import type { DayItem, Routine, Task } from "./types";

/**
 * the routine rows that need creating for a day.
 * today's list is built lazily the first time it is opened, and this is the
 * only place that decides what goes on it. it never duplicates a routine that
 * already has a row for that date (a snoozed item can land there first).
 */
export function routineRowsToCreate(
  date: string,
  routines: Routine[],
  existingRoutineIds: Set<string>,
): { routine_id: string; project_id: string; title: string; date: string; bonus: boolean }[] {
  return routines
    .filter((r) => r.active && isDue(r, date) && !existingRoutineIds.has(r.id))
    .sort((a, b) => a.sort - b.sort)
    .map((r) => ({
      routine_id: r.id,
      project_id: r.project_id,
      title: r.title,
      date,
      bonus: r.schedule_type === "bonus",
    }));
}

const CARRY_WINDOW_DAYS = 7;

/**
 * the "from yesterday?" tray. looks back at most a week for the most recent
 * day that left something unfinished, and offers only that day, so the tray
 * can never turn into a backlog. anything older quietly lapses.
 *
 * excluded on purpose:
 *  - bonus items (never count as unfinished)
 *  - sticky tasks (they already show every day)
 *  - dismissed items
 *  - routines that are already on today's list (they came back by themselves)
 */
export function pickCarryOver(
  tasks: Task[],
  today: string,
  routineIdsOnToday: Set<string>,
): { date: string; items: Task[] } | null {
  const candidates = tasks.filter(
    (t) =>
      t.date < today &&
      diffDays(t.date, today) <= CARRY_WINDOW_DAYS &&
      !t.done_at &&
      !t.dismissed_at &&
      !t.bonus &&
      !t.sticky &&
      !(t.routine_id && routineIdsOnToday.has(t.routine_id)),
  );
  if (candidates.length === 0) return null;
  const date = candidates.reduce((latest, t) => (t.date > latest ? t.date : latest), candidates[0].date);
  return { date, items: candidates.filter((t) => t.date === date) };
}

/**
 * everything on a given day, for display (week view and today).
 *  - real rows for that date
 *  - for today and later: routines due that day that have no row yet
 *  - for today and later: sticky tasks that are still open
 */
export function buildDay(args: {
  date: string;
  today: string;
  routines: Routine[];
  tasks: Task[]; // any rows; filtered to `date` in here
  stickyOpen: Task[]; // open sticky tasks
}): DayItem[] {
  const { date, today, routines, tasks, stickyOpen } = args;
  const rows = tasks.filter((t) => t.date === date && !t.dismissed_at && !t.sticky);
  const items: DayItem[] = rows.map((t) => ({
    key: t.id,
    id: t.id,
    title: t.title,
    project_id: t.project_id,
    routine_id: t.routine_id,
    bonus: t.bonus,
    sticky: false,
    done: !!t.done_at,
  }));

  if (date >= today) {
    const have = new Set(rows.map((t) => t.routine_id).filter(Boolean) as string[]);
    for (const r of routineRowsToCreate(date, routines, have)) {
      items.push({
        key: `routine:${r.routine_id}:${date}`,
        id: null,
        title: r.title,
        project_id: r.project_id,
        routine_id: r.routine_id,
        bonus: r.bonus,
        sticky: false,
        done: false,
      });
    }
    for (const t of stickyOpen) {
      if (t.date <= date) {
        items.push({
          key: `sticky:${t.id}:${date}`,
          id: t.id,
          title: t.title,
          project_id: t.project_id,
          routine_id: null,
          bonus: false,
          sticky: true,
          done: false,
        });
      }
    }
  }
  return items;
}

/**
 * celebratory-only streak: how many days in a row everything on the main
 * list got ticked. today only counts once it is fully done; a missing or
 * unfinished yesterday ends the run quietly (nothing is ever shown for it).
 */
export function clearStreak(tasks: Task[], today: string): number {
  const byDate = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    if (t.bonus || t.sticky || t.dismissed_at) continue;
    const e = byDate.get(t.date) ?? { total: 0, done: 0 };
    e.total += 1;
    if (t.done_at) e.done += 1;
    byDate.set(t.date, e);
  }
  const isClear = (d: string) => {
    const e = byDate.get(d);
    return !!e && e.total > 0 && e.done === e.total;
  };
  let day = isClear(today) ? today : addDays(today, -1);
  let n = 0;
  while (isClear(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}
