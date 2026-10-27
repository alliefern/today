import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { SetupNotice } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

// everything behind the login is personal, so nothing here is ever prerendered or cached
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseEnv()) {
    return (
      <main className="page py-10">
        <div className="card p-6">
          <SetupNotice />
        </div>
      </main>
    );
  }
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <main className="page pb-32 pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</main>
      <Nav />
    </>
  );
}
