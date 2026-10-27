import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, todayIn } from "./dates";
import { clearStreak, pickCarryOver, routineRowsToCreate } from "./plan";
import { seedAccount } from "@/seed/run";
import { DEFAULT_SETTINGS, type Project, type Routine, type Settings, type Task } from "./types";

/** how far back we look for the tray and the streak */
const HISTORY_DAYS = 60;

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

export async function getSettings(db: SupabaseClient): Promise<Settings> {
  const { data, error } = await db
    .from("settings")
    .select("carry_over, week_start, timezone, gwd_scheduled_through")
    .maybeSingle();
  if (error) fail("couldn't load settings", error);
  if (data) return data as Settings;
  // first visit: create the row with defaults (user_id fills itself in)
  const { error: insErr } = await db.from("settings").upsert(DEFAULT_SETTINGS, { onConflict: "user_id", ignoreDuplicates: true });
  if (insErr) fail("couldn't create settings", insErr);
  return { ...DEFAULT_SETTINGS };
}

export async function listProjects(db: SupabaseClient): Promise<Project[]> {
  const { data, error } = await db.from("projects").select("*").order("sort").order("created_at");
  if (error) fail("couldn't load projects", error);
  return data as Project[];
}

export async function listRoutines(db: SupabaseClient): Promise<Routine[]> {
  const { data, error } = await db.from("routines").select("*").order("sort").order("created_at");
  if (error) fail("couldn't load routines", error);
  return data as Routine[];
}

export async function listOpenSticky(db: SupabaseClient): Promise<Task[]> {
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .eq("sticky", true)
    .is("done_at", null)
    .is("dismissed_at", null)
    .order("created_at");
  if (error) fail("couldn't load pinned tasks", error);
  return data as Task[];
}

/** tasks between two dates, inclusive */
export async function listTasksBetween(db: SupabaseClient, from: string, to: string): Promise<Task[]> {
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("created_at");
  if (error) fail("couldn't load tasks", error);
  return data as Task[];
}

/**
 * gives a brand new account its day-one projects and routines. called once, at
 * sign-in (never from a page render, where two overlapping requests could both
 * see an empty account and seed it twice). does nothing if the account already
 * has projects.
 */
export async function seedIfNew(db: SupabaseClient): Promise<void> {
  try {
    const settings = await getSettings(db);
    await seedAccount(db, { today: todayIn(settings.timezone) });
  } catch (e) {
    // never block signing in over this. the list just starts empty, and
    // `npm run seed` can fill it in.
    console.error("seeding a new account failed:", e instanceof Error ? e.message : "unknown error");
  }
}

export interface TodayData {
  today: string;
  settings: Settings;
  projects: Project[];
  routines: Routine[];
  /** everything on today's list, main + bonus, done or not */
  tasks: Task[];
  /** open pinned tasks (sticky), already included in `tasks` */
  tray: { date: string; items: Task[] } | null;
  streak: number;
}

/**
  * builds today. this is the only place the day's list gets created: the first
 * time a day is opened, its routine rows are inserted (idempotently), and the
 * "from yesterday?" tray is worked out according to the carry-over setting.
 */
export async function loadToday(db: SupabaseClient): Promise<TodayData> {
  const settings = await getSettings(db);
  const today = todayIn(settings.timezone);

  const [projects, routines] = await Promise.all([listProjects(db), listRoutines(db)]);

  const [recent, sticky] = await Promise.all([
    listTasksBetween(db, addDays(today, -HISTORY_DAYS), today),
    listOpenSticky(db),
  ]);

  // 1. make sure today's routine rows exist
  const onToday = recent.filter((t) => t.date === today);
  const missing = routineRowsToCreate(
    today,
    routines,
    new Set(onToday.map((t) => t.routine_id).filter(Boolean) as string[]),
  );
  let all = recent;
  if (missing.length) {
    const { data, error } = await db
      .from("tasks")
      .upsert(missing, { onConflict: "routine_id,date", ignoreDuplicates: true })
      .select("*");
    if (error) fail("couldn't build today's list", error);
    all = [...recent, ...((data ?? []) as Task[])];
  }

  // 2. carry-over, per the setting
  const routineIdsOnToday = new Set(
    all.filter((t) => t.date === today && t.routine_id).map((t) => t.routine_id as string),
  );
  const carry = settings.carry_over === "never" ? null : pickCarryOver(all, today, routineIdsOnToday);
  let tray: TodayData["tray"] = null;
  if (carry && settings.carry_over === "auto") {
    const ids = carry.items.map((t) => t.id);
    const { error } = await db.from("tasks").update({ date: today }).in("id", ids);
    if (error) fail("couldn't carry things over", error);
    all = all.map((t) => (ids.includes(t.id) ? { ...t, date: today } : t));
  } else if (carry) {
    tray = carry;
  }

  // 3. open pinned tasks that have started count as today's (they have no
  // per-day rows, and may be older than the history window)
  const byId = new Map<string, Task>();
  for (const t of all) if (t.date === today && !t.dismissed_at) byId.set(t.id, t);
  for (const t of sticky) if (t.date <= today) byId.set(t.id, t);

  return { today, settings, projects, routines, tasks: [...byId.values()], tray, streak: clearStreak(all, today) };
}
