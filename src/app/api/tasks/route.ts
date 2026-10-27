import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isIsoDate, todayIn } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownerEmail } from "@/lib/supabase/env";
import { DEFAULT_SETTINGS } from "@/lib/types";

/**
 * POST /api/tasks: lets an assistant drop a one-off task into a project.
 *
 *   curl -X POST https://<your-app>/api/tasks \
 *     -H "Authorization: Bearer $TASKS_API_TOKEN" -H "Content-Type: application/json" \
 *     -d '{"title":"approve kate's tuesday post","project":"Kate Francis socials"}'
 *
 * body: { title: string, project?: string (name or id), date?: "yyyy-mm-dd", bonus?: boolean }
 * auth: a long random secret in the TASKS_API_TOKEN env var. never logged, never echoed.
 */

const digest = (s: string) => createHash("sha256").update(s).digest();

function authorized(req: NextRequest): boolean {
  const secret = process.env.TASKS_API_TOKEN;
  if (!secret || secret.length < 24) return false; // refuse to run with a weak or missing token
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // hash both sides so the comparison is constant-time and length-safe
  return timingSafeEqual(digest(given), digest(secret));
}

const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (!process.env.TASKS_API_TOKEN) return json({ error: "the task api isn't switched on" }, 503);
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);

  let body: { title?: unknown; project?: unknown; date?: unknown; bonus?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "send a json body" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 300) return json({ error: "title is required (max 300 characters)" }, 422);
  if (body.date !== undefined && !isIsoDate(body.date)) return json({ error: "date must look like 2026-11-01" }, 422);

  try {
    const db = createAdminClient();

    // single-user app: the owner is whoever signs in with OWNER_EMAIL
    const email = ownerEmail();
    if (!email) return json({ error: "OWNER_EMAIL isn't set" }, 503);
    const { data: users, error: uErr } = await db.auth.admin.listUsers({ perPage: 200 });
    if (uErr) throw uErr;
    const owner = users.users.find((u) => u.email?.toLowerCase() === email);
    if (!owner) return json({ error: "the owner hasn't signed in yet" }, 409);

    const { data: s } = await db.from("settings").select("timezone").eq("user_id", owner.id).maybeSingle();
    const date = (body.date as string | undefined) ?? todayIn(s?.timezone ?? DEFAULT_SETTINGS.timezone);

    let projectId: string | null = null;
    if (typeof body.project === "string" && body.project.trim()) {
      const wanted = body.project.trim().toLowerCase();
      const { data: projects, error: pErr } = await db.from("projects").select("id, name").eq("user_id", owner.id);
      if (pErr) throw pErr;
      const match = projects?.find((p) => p.id === body.project || p.name.toLowerCase() === wanted);
      if (!match) return json({ error: "unknown project", projects: projects?.map((p) => p.name) ?? [] }, 422);
      projectId = match.id;
    }

    const { data: row, error } = await db
      .from("tasks")
      .insert({ user_id: owner.id, title, date, project_id: projectId, bonus: body.bonus === true })
      .select("id")
      .single();
    if (error) throw error;
    return json({ ok: true, id: row.id, date }, 201);
  } catch {
    // deliberately vague: details stay out of responses and logs
    return json({ error: "couldn't save that task" }, 500);
  }
}
