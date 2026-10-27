/**
 * seeds day-one data for an existing account using the service-role key.
 *
 *   npm run seed                      # uses OWNER_EMAIL from .env.local
 *   npm run seed -- you@example.com   # or name the account
 *   npm run seed -- --force           # add the seed data even if the account has projects
 *
 * you normally don't need this: the app seeds a brand new account the first
 * time it signs in. this is for resets and for seeding a different account.
 * the user has to have signed in once so their account exists.
 */
import { createClient } from "@supabase/supabase-js";
import { todayIn } from "../src/lib/dates";
import { DEFAULT_SETTINGS } from "../src/lib/types";
import { seedAccount } from "../src/seed/run";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const force = process.argv.includes("--force");
  const email = (process.argv.slice(2).find((a) => a.includes("@")) ?? process.env.OWNER_EMAIL ?? "").toLowerCase();

  if (!url || !key) {
    console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (check .env.local)");
    process.exit(1);
  }
  if (!email) {
    console.error("tell me whose account: npm run seed -- you@example.com (or set OWNER_EMAIL)");
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    console.error(`couldn't list users: ${error.message}`);
    process.exit(1);
  }
  const user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.error(`no account for ${email} yet. sign in to the app once, then run this again.`);
    process.exit(1);
  }

  // the service role bypasses rls, so every read below is scoped to this user by hand
  if (!force) {
    const { count } = await db.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) > 0) {
      console.log(`${email} already has projects, so nothing was added. use --force to add the seed data anyway.`);
      process.exit(0);
    }
  }

  const { data: s } = await db.from("settings").select("timezone").eq("user_id", user.id).maybeSingle();
  const today = todayIn(s?.timezone ?? DEFAULT_SETTINGS.timezone);
  await seedAccount(db, { today, userId: user.id, force: true });
  console.log(`seeded ${email}. open the app and your list is waiting.`);

}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
