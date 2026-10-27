import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** signed-in client for server components and server actions (rls applies) */
export async function createClient() {
  // reading cookies first opts the calling page into per-request rendering
  const store = await cookies();
  const env = supabaseEnv();
  if (!env) throw new Error("supabase env vars are missing");
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a server component, which can't set cookies.
          // fine: the proxy refreshes the session on the next request.
        }
      },
    },
  });
}
