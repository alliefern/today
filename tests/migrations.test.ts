import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * runs the real migration files against an in-process postgres, with a tiny
 * stand-in for supabase's auth schema, then tries to break row-level security.
 */

const dir = path.resolve(import.meta.dirname, "../supabase/migrations");
const ALLIE = "11111111-1111-1111-1111-111111111111";
const STRANGER = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

/** run as a signed-in user (what an authenticated api request looks like) */
async function asUser<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    insert into auth.users values ('${ALLIE}', 'allie@example.com'), ('${STRANGER}', 'stranger@example.com');
  `);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }
});

describe("schema", () => {
  it("has row-level security on every table, with no exceptions", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    expect(rows.map((r) => r.relname).sort()).toEqual(["projects", "routines", "settings", "tasks"]);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });

  it("has no time-of-day columns anywhere (no times, no time blocks)", async () => {
    const { rows } = await db.query<{ column_name: string; data_type: string }>(
      `select column_name, data_type from information_schema.columns
       where table_schema = 'public' and (data_type like 'time%' )`,
    );
    // timestamptz is only used for bookkeeping: created_at, updated_at, done_at, dismissed_at
    expect(rows.map((r) => r.column_name).sort()).toEqual(
      ["created_at", "created_at", "created_at", "created_at", "dismissed_at", "done_at", "updated_at"].sort(),
    );
  });
});

describe("row-level security", () => {
  let projectId: string;

  it("lets the owner create and read their own rows (user_id fills itself in)", async () => {
    await asUser(ALLIE, async () => {
      const p = await db.query<{ id: string }>(`insert into projects (name) values ('threads') returning id`);
      projectId = p.rows[0].id;
      await db.query(`insert into routines (project_id, title, schedule_type) values ($1, 'post whatever threadbot sent', 'daily')`, [projectId]);
      await db.query(`insert into tasks (project_id, title, date) values ($1, 'one-off', '2026-10-27')`, [projectId]);
      const { rows } = await db.query(`select * from tasks`);
      expect(rows).toHaveLength(1);
    });
  });

  it("shows a stranger nothing, and the anon role nothing", async () => {
    await asUser(STRANGER, async () => {
      for (const t of ["projects", "routines", "tasks", "settings"]) {
        const { rows } = await db.query(`select * from ${t}`);
        expect(rows, t).toHaveLength(0);
      }
    });
    await db.exec(`set role anon`);
    await expect(db.query(`select * from projects`)).rejects.toThrow(/permission denied/);
    await db.exec(`reset role`);
  });

  it("stops a stranger changing or deleting someone else's rows", async () => {
    await asUser(STRANGER, async () => {
      const upd = await db.query(`update tasks set title = 'hacked' returning id`);
      const del = await db.query(`delete from projects returning id`);
      expect(upd.rows).toHaveLength(0);
      expect(del.rows).toHaveLength(0);
    });
    const { rows } = await db.query<{ title: string }>(`select title from tasks`);
    expect(rows[0].title).toBe("one-off");
  });

  it("stops a stranger writing rows as someone else, or attaching them to someone else's project", async () => {
    await asUser(STRANGER, async () => {
      await expect(db.query(`insert into projects (user_id, name) values ('${ALLIE}', 'sneaky')`)).rejects.toThrow(/row-level security/);
      await expect(
        db.query(`insert into tasks (project_id, title, date) values ($1, 'sneaky', '2026-10-27')`, [projectId]),
      ).rejects.toThrow(/foreign key|row-level security/);
    });
  });
});

describe("constraints", () => {
  it("allows one row per routine per day, but unlimited one-offs", async () => {
    await asUser(ALLIE, async () => {
      const r = await db.query<{ id: string; project_id: string }>(`select id, project_id from routines limit 1`);
      const { id, project_id } = r.rows[0];
      await db.query(`insert into tasks (project_id, routine_id, title, date) values ($1, $2, 'a', '2026-10-28')`, [project_id, id]);
      await expect(
        db.query(`insert into tasks (project_id, routine_id, title, date) values ($1, $2, 'dupe', '2026-10-28')`, [project_id, id]),
      ).rejects.toThrow(/unique|duplicate/);
      await db.query(`insert into tasks (title, date) values ('loose 1', '2026-10-28'), ('loose 2', '2026-10-28')`);
    });
  });

  it("keeps finished history when a routine is deleted, but takes tasks with a deleted project", async () => {
    await asUser(ALLIE, async () => {
      const p = await db.query<{ id: string }>(`insert into projects (name) values ('temp') returning id`);
      const r = await db.query<{ id: string }>(`insert into routines (project_id, title) values ($1, 'temp routine') returning id`, [p.rows[0].id]);
      await db.query(`insert into tasks (project_id, routine_id, title, date, done_at) values ($1, $2, 'did it', '2026-10-20', now())`, [p.rows[0].id, r.rows[0].id]);
      await db.query(`delete from routines where id = $1`, [r.rows[0].id]);
      const kept = await db.query<{ routine_id: string | null; user_id: string }>(`select routine_id, user_id from tasks where title = 'did it'`);
      expect(kept.rows[0].routine_id).toBeNull();
      expect(kept.rows[0].user_id).toBe(ALLIE); // set null touched routine_id only, not the owner
      await db.query(`delete from projects where id = $1`, [p.rows[0].id]);
      expect((await db.query(`select 1 from tasks where title = 'did it'`)).rows).toHaveLength(0);
    });
  });

  it("rejects nonsense schedules and values", async () => {
    await asUser(ALLIE, async () => {
      const pid = (await db.query<{ id: string }>(`select id from projects limit 1`)).rows[0].id;
      const bad = (sql: string) => expect(db.query(sql, [pid])).rejects.toThrow(/check constraint/);
      await bad(`insert into routines (project_id, title, schedule_type) values ($1, 'x', 'weekdays')`); // no days
      await bad(`insert into routines (project_id, title, schedule_type, weekdays) values ($1, 'x', 'weekly', '{1,2}')`); // two days
      await bad(`insert into routines (project_id, title, schedule_type) values ($1, 'x', 'monthly')`); // no date
      await bad(`insert into routines (project_id, title, schedule_type, weekdays) values ($1, 'x', 'weekdays', '{9}')`);
      await bad(`insert into routines (project_id, title, schedule_type) values ($1, 'x', 'fortnightly')`);
      await bad(`insert into projects (name, color) values ('x', 'pink') returning $1::text`);
      await bad(`insert into projects (name, link) values ('x', 'javascript:alert(1)') returning $1::text`);
    });
  });

  it("creates settings with london and ask-me defaults, and a carry-over that can only be one of three", async () => {
    await asUser(ALLIE, async () => {
      await db.query(`insert into settings default values`);
      const { rows } = await db.query<{ timezone: string; carry_over: string; week_start: number }>(`select * from settings`);
      expect(rows[0]).toMatchObject({ timezone: "Europe/London", carry_over: "ask", week_start: 1 });
      await expect(db.query(`update settings set carry_over = 'yolo'`)).rejects.toThrow(/check constraint/);
    });
  });
});
