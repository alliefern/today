"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, isIsoDate, isValidTimeZone, todayIn } from "./dates";
import { getSettings } from "./data";
import { routineRowsToCreate } from "./plan";
import { isDue, normalizeSchedule } from "./schedule";
import { createClient } from "./supabase/server";
import type { CarryOver, Routine } from "./types";

export type Result = { ok: true } | { ok: false; error: string };

async function ctx() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("you're signed out. refresh and sign back in");
  const settings = await getSettings(db);
  return { db, settings, today: todayIn(settings.timezone) };
}

async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "something went sideways";
    return { ok: false, error: msg.toLowerCase() };
  }
}

function check(error: { message: string; code?: string } | null) {
  if (error) throw new Error(error.message);
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function cleanText(value: unknown, max: number, what: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new Error(`${what} can't be empty`);
  if (v.length > max) throw new Error(`${what} is too long (max ${max})`);
  return v;
}

function cleanOptional(value: unknown, max: number): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v.slice(0, max) : null;
}

function cleanLink(value: unknown): string | null {
  const v = cleanOptional(value, 300);
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    new URL(withScheme);
  } catch {
    throw new Error("that link doesn't look right");
  }
  return withScheme;
}

/* ------------------------------------------------------------------ tasks */

export async function toggleDone(id: string, done: boolean): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    const { data: task, error } = await db.from("tasks").select("sticky").eq("id", id).single();
    check(error);
    // a pinned task ticked today belongs to today, so it stays visible (as done) on refresh
    const patch = done
      ? { done_at: new Date().toISOString(), ...(task?.sticky ? { date: today } : {}) }
      : { done_at: null };
    check((await db.from("tasks").update(patch).eq("id", id)).error);
  });
}

export async function snoozeTask(id: string): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    const tomorrow = addDays(today, 1);
    const { data: task, error } = await db.from("tasks").select("*").eq("id", id).single();
    check(error);
    if (!task) throw new Error("couldn't find that task");

    if (!task.routine_id) {
      check((await db.from("tasks").update({ date: tomorrow }).eq("id", id)).error);
      return;
    }
    // routine rows are regenerated for any day they're due, so moving the row would
    // just bring it straight back. keep today's row as a dismissed placeholder and
    // give tomorrow its own copy.
    check((await db.from("tasks").update({ dismissed_at: new Date().toISOString() }).eq("id", id)).error);
    check(
      (
        await db.from("tasks").upsert(
          {
            routine_id: task.routine_id,
            project_id: task.project_id,
            title: task.title,
            date: tomorrow,
            bonus: task.bonus,
          },
          { onConflict: "routine_id,date", ignoreDuplicates: true },
        )
      ).error,
    );
  });
}

/** the undo for snoozeTask */
export async function undoSnooze(id: string, originalDate: string): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    const { data: task, error } = await db.from("tasks").select("*").eq("id", id).single();
    check(error);
    if (!task) throw new Error("couldn't find that task");
    if (task.routine_id && task.dismissed_at) {
      check((await db.from("tasks").update({ dismissed_at: null }).eq("id", id)).error);
      check(
        (
          await db
            .from("tasks")
            .delete()
            .eq("routine_id", task.routine_id)
            .eq("date", addDays(today, 1))
            .is("done_at", null)
        ).error,
      );
    } else {
      check((await db.from("tasks").update({ date: originalDate }).eq("id", id)).error);
    }
  });
}

export async function setBonus(id: string, bonus: boolean): Promise<Result> {
  return run(async () => {
    const { db } = await ctx();
    check((await db.from("tasks").update({ bonus }).eq("id", id)).error);
  });
}

export async function addTask(input: {
  title: string;
  projectId?: string | null;
  date?: string | null;
  bonus?: boolean;
}): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    const title = cleanText(input.title, 300, "that task");
    const date = input.date && isIsoDate(input.date) ? input.date : today;
    check(
      (
        await db.from("tasks").insert({
          title,
          date,
          project_id: input.projectId || null,
          bonus: !!input.bonus,
        })
      ).error,
    );
  });
}

export async function deleteTask(id: string): Promise<Result> {
  return run(async () => {
    const { db } = await ctx();
    const { data: task } = await db.from("tasks").select("routine_id").eq("id", id).maybeSingle();
    if (task?.routine_id) {
      // a deleted routine row would simply be rebuilt, so let it go instead
      check((await db.from("tasks").update({ dismissed_at: new Date().toISOString() }).eq("id", id)).error);
      return;
    }
    check((await db.from("tasks").delete().eq("id", id)).error);
  });
}

/* ------------------------------------------------------- "from yesterday?" */

export async function bringToToday(ids: string[]): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    for (const id of ids.slice(0, 50)) {
      const { error } = await db.from("tasks").update({ date: today }).eq("id", id);
      if (error?.code === "23505") check((await db.from("tasks").delete().eq("id", id)).error);
      else check(error);
    }
  });
}

export async function letGo(ids: string[]): Promise<Result> {
  return run(async () => {
    const { db } = await ctx();
    check(
      (await db.from("tasks").update({ dismissed_at: new Date().toISOString() }).in("id", ids.slice(0, 50))).error,
    );
  });
}

/* -------------------------------------------------------------- lookahead */

export async function setLookahead(date: string | null): Promise<Result> {
  return run(async () => {
    const { db } = await ctx();
    if (date !== null && !isIsoDate(date)) throw new Error("pick a real date");
    check((await db.from("settings").update({ gwd_scheduled_through: date }).not("user_id", "is", null)).error);
  });
}

/* --------------------------------------------------------------- projects */

interface ProjectInput {
  name: string;
  color: string;
  emoji: string;
  link?: string | null;
  helper?: string | null;
}

function cleanProject(input: ProjectInput) {
  if (!HEX.test(input.color)) throw new Error("pick a color");
  return {
    name: cleanText(input.name, 80, "the name"),
    color: input.color,
    emoji: cleanText(input.emoji, 16, "the emoji"),
    link: cleanLink(input.link),
    helper: cleanOptional(input.helper, 80),
  };
}

export async function createProject(input: ProjectInput): Promise<Result & { id?: string }> {
  let id: string | undefined;
  const res = await run(async () => {
    const { db } = await ctx();
    const { data: last } = await db.from("projects").select("sort").order("sort", { ascending: false }).limit(1);
    const sort = ((last?.[0]?.sort as number | undefined) ?? -1) + 1;
    const { data, error } = await db.from("projects").insert({ ...cleanProject(input), sort }).select("id").single();
    check(error);
    id = data?.id;
  });
  return res.ok ? { ok: true, id } : res;
}

export async function updateProject(id: string, input: ProjectInput): Promise<Result> {
  return run(async () => {
    const { db } = await ctx();
    check((await db.from("projects").update(cleanProject(input)).eq("id", id)).error);
  });
}

export async function deleteProject(id: string): Promise<Result> {
  return run(async () => {
    const { db } = await ctx();
    // routines and tasks go with it (cascade)
    check((await db.from("projects").delete().eq("id", id)).error);
  });
}

/* --------------------------------------------------------------- routines */

interface RoutineInput {
  projectId: string;
  title: string;
  schedule_type: string;
  weekdays?: number[];
  day_of_month?: number | null;
}

function cleanRoutine(input: RoutineInput) {
  const schedule = normalizeSchedule(input);
  if (!schedule.ok) throw new Error(schedule.error);
  return { title: cleanText(input.title, 200, "the routine"), ...schedule.value };
}

/** after a routine changes, make today's list agree with it (open rows only) */
async function syncRoutineToday(
  db: Awaited<ReturnType<typeof createClient>>,
  routine: Routine,
  today: string,
) {
  const { data: rows, error } = await db
    .from("tasks")
    .select("id, date, done_at, dismissed_at")
    .eq("routine_id", routine.id)
    .gte("date", today);
  check(error);
  const todaysRow = rows?.find((r) => r.date === today);

  if (todaysRow && !todaysRow.done_at && !todaysRow.dismissed_at && !(routine.active && isDue(routine, today))) {
    check((await db.from("tasks").delete().eq("id", todaysRow.id)).error);
  }
  if (!todaysRow) {
    const create = routineRowsToCreate(today, [routine], new Set());
    if (create.length) check((await db.from("tasks").insert(create)).error);
  }
  // keep wording and project in step on anything still open
  check(
    (
      await db
        .from("tasks")
        .update({ title: routine.title, project_id: routine.project_id })
        .eq("routine_id", routine.id)
        .gte("date", today)
        .is("done_at", null)
    ).error,
  );
  // moving to or from "bonus" changes where today's row sits
  check(
    (
      await db
        .from("tasks")
        .update({ bonus: routine.schedule_type === "bonus" })
        .eq("routine_id", routine.id)
        .eq("date", today)
        .is("done_at", null)
    ).error,
  );
}

export async function createRoutine(input: RoutineInput): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    const { data: last } = await db.from("routines").select("sort").order("sort", { ascending: false }).limit(1);
    const sort = ((last?.[0]?.sort as number | undefined) ?? -1) + 1;
    const { data, error } = await db
      .from("routines")
      .insert({ project_id: input.projectId, ...cleanRoutine(input), sort })
      .select("*")
      .single();
    check(error);
    await syncRoutineToday(db, data as Routine, today);
  });
}

export async function updateRoutine(id: string, input: RoutineInput): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    const { data, error } = await db
      .from("routines")
      .update({ project_id: input.projectId, ...cleanRoutine(input) })
      .eq("id", id)
      .select("*")
      .single();
    check(error);
    await syncRoutineToday(db, data as Routine, today);
  });
}

export async function setRoutineActive(id: string, active: boolean): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    const { data, error } = await db.from("routines").update({ active }).eq("id", id).select("*").single();
    check(error);
    await syncRoutineToday(db, data as Routine, today);
  });
}

export async function deleteRoutine(id: string): Promise<Result> {
  return run(async () => {
    const { db, today } = await ctx();
    // clear whatever is still open from today on; finished history stays
    check((await db.from("tasks").delete().eq("routine_id", id).gte("date", today).is("done_at", null)).error);
    check((await db.from("routines").delete().eq("id", id)).error);
  });
}

/* --------------------------------------------------------------- settings */

export async function updateSettings(input: {
  carry_over: CarryOver;
  week_start: number;
  timezone: string;
}): Promise<Result> {
  return run(async () => {
    const { db } = await ctx();
    if (!["auto", "ask", "never"].includes(input.carry_over)) throw new Error("pick a carry-over option");
    if (!Number.isInteger(input.week_start) || input.week_start < 0 || input.week_start > 6) {
      throw new Error("pick a week start");
    }
    if (!isValidTimeZone(input.timezone)) throw new Error("that time zone isn't one i know");
    check((await db.from("settings").update(input).not("user_id", "is", null)).error);
  });
}

/* ------------------------------------------------------------------- auth */

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}
