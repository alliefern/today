import type { SupabaseClient } from "@supabase/supabase-js";
import { SEED_PROJECTS, SEED_ROUTINES, seedOneOffs } from "./data";

/**
 * seeds a brand new account. safe to call twice: it does nothing if the
 * account already has any project.
 *
 * with a signed-in client, row-level security fills in user_id. with the
 * service-role client (the `npm run seed` script) pass `userId` explicitly.
 */
export async function seedAccount(
  db: SupabaseClient,
  opts: { today: string; userId?: string; force?: boolean },
): Promise<{ seeded: boolean }> {
  const owner = opts.userId ? { user_id: opts.userId } : {};

  if (!opts.force) {
    const { count, error } = await db.from("projects").select("id", { count: "exact", head: true });
    if (error) throw new Error(`seed check failed: ${error.message}`);
    if ((count ?? 0) > 0) return { seeded: false };
  }

  const { data: projects, error: pErr } = await db
    .from("projects")
    .insert(
      SEED_PROJECTS.map((p, i) => ({
        ...owner,
        name: p.name,
        color: p.color,
        emoji: p.emoji,
        link: p.link ?? null,
        helper: p.helper ?? null,
        sort: i,
      })),
    )
    .select("id, name");
  if (pErr || !projects) throw new Error(`seeding projects failed: ${pErr?.message}`);

  const idByKey = new Map<string, string>();
  SEED_PROJECTS.forEach((p) => {
    const row = projects.find((r) => r.name === p.name);
    if (row) idByKey.set(p.key, row.id);
  });

  const { error: rErr } = await db.from("routines").insert(
    SEED_ROUTINES.map((r, i) => ({
      ...owner,
      project_id: idByKey.get(r.project)!,
      title: r.title,
      schedule_type: r.schedule_type,
      weekdays: r.weekdays ?? [],
      sort: i,
    })),
  );
  if (rErr) throw new Error(`seeding routines failed: ${rErr.message}`);

  const { error: tErr } = await db.from("tasks").insert(
    seedOneOffs(opts.today).map((t) => ({
      ...owner,
      project_id: idByKey.get(t.project)!,
      title: t.title,
      date: t.date,
      sticky: t.sticky ?? false,
    })),
  );
  if (tErr) throw new Error(`seeding one-off tasks failed: ${tErr.message}`);

  return { seeded: true };
}
