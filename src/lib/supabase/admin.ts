import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * service-role client. bypasses row-level security, so it is only for the
 * assistant api and the seed script, never for anything a browser can reach
 * with its own input. the key is read from env and never logged.
 */
export function createAdminClient() {
  const env = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) throw new Error("service role is not configured");
  return createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
