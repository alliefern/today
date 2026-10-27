import { SettingsForm } from "@/components/settings-form";
import { getSettings } from "@/lib/data";
import { signOut } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata = { title: "settings · today" };

export default async function SettingsPage() {
  if (!supabaseEnv()) return null; // the layout explains how to connect a database
  const db = await createClient();
  const [settings, { data }] = await Promise.all([getSettings(db), db.auth.getUser()]);

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="text-4xl font-extrabold">settings</h1>
        <p className="mt-1 text-lg text-ink-soft">set it once, then forget it exists.</p>
      </header>

      <SettingsForm initial={{ carry_over: settings.carry_over, week_start: settings.week_start, timezone: settings.timezone }} />

      <section className="card space-y-3 p-5" aria-labelledby="install">
        <h2 id="install" className="text-2xl font-extrabold">put it on your phone</h2>
        <p>
          <strong>iphone:</strong> open this in safari, tap share, then "add to home screen".
        </p>
        <p>
          <strong>android:</strong> open this in chrome, tap the menu, then "install app".
        </p>
        <p className="text-sm text-ink-soft">
          signing in from the installed app? ask for the 6-digit code instead of the link, and you'll stay inside the app.
        </p>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="account">
        <h2 id="account" className="text-2xl font-extrabold">account</h2>
        <p className="text-ink-soft">signed in as {data.user?.email ?? "you"}</p>
        <form action={signOut}>
          <button className="btn-soft">sign out</button>
        </form>
      </section>
    </div>
  );
}
