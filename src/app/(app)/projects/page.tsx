import Link from "next/link";
import { NewProject } from "@/components/new-project";
import { listProjects, listRoutines } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata = { title: "projects · today" };

export default async function ProjectsPage() {
  if (!supabaseEnv()) return null; // the layout explains how to connect a database
  const db = await createClient();
  const [projects, routines] = await Promise.all([listProjects(db), listRoutines(db)]);

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-4xl font-extrabold">projects</h1>
        <p className="mt-1 text-lg text-ink-soft">
          {projects.length} {projects.length === 1 ? "thing" : "things"} on the go. tap one to tweak its routines.
        </p>
      </header>

      <ul className="space-y-3">
        {projects.map((p) => {
          const mine = routines.filter((r) => r.project_id === p.id);
          const paused = mine.filter((r) => !r.active).length;
          return (
            <li key={p.id} style={{ "--c": p.color } as React.CSSProperties}>
              <Link href={`/projects/${p.id}`} className="tint flex items-center gap-4 rounded-[1.75rem] p-4">
                <span className="chip-bg grid size-14 shrink-0 place-items-center rounded-2xl text-3xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold leading-tight">{p.name}</span>
                  <span className="block text-sm text-ink-soft">
                    {mine.length} routine{mine.length === 1 ? "" : "s"}
                    {paused > 0 && ` · ${paused} paused`}
                    {p.helper && ` · with ${p.helper}`}
                  </span>
                </span>
                <span aria-hidden className="text-2xl">
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <NewProject />
    </div>
  );
}
