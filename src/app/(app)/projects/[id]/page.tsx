import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectActions } from "@/components/project-actions";
import { RoutineForm } from "@/components/routine-form";
import { RoutineItem } from "@/components/routine-item";
import { listRoutines } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Project } from "@/lib/types";

export const metadata = { title: "project · today" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseEnv()) return null; // the layout explains how to connect a database
  if (!UUID.test(id)) notFound();

  const db = await createClient();
  const { data } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const project = data as Project;
  const routines = (await listRoutines(db)).filter((r) => r.project_id === id);

  return (
    <div className="space-y-6" style={{ "--c": project.color } as React.CSSProperties}>
      <Link href="/projects" className="inline-flex min-h-11 items-center rounded-full px-1 text-sm font-bold underline underline-offset-4">
        ← all projects
      </Link>

      <header className="tint rounded-[2rem] p-6">
        <span className="chip-bg grid size-16 place-items-center rounded-2xl text-4xl" aria-hidden>
          {project.emoji}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight">{project.name}</h1>
        {project.helper && <p className="mt-1 text-base">handled by {project.helper}</p>}
        {project.link && (
          <a href={project.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center break-all font-bold underline underline-offset-4">
            {project.link.replace(/^https?:\/\//, "")} ↗
          </a>
        )}
      </header>

      <ProjectActions project={project} />

      <section aria-labelledby="routines" className="space-y-3">
        <h2 id="routines" className="text-2xl font-extrabold">
          routines
        </h2>
        {routines.length === 0 ? (
          <p className="text-ink-soft">nothing recurring yet. add one below and it'll show up on the right days.</p>
        ) : (
          <ul className="tint space-y-2 rounded-[1.75rem] p-2">
            {routines.map((r) => (
              <RoutineItem key={r.id} routine={r} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="add-routine" className="card p-5">
        <h2 id="add-routine" className="mb-4 text-2xl font-extrabold">
          add a routine
        </h2>
        <RoutineForm projectId={project.id} />
      </section>
    </div>
  );
}
