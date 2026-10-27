"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProject } from "@/lib/actions";
import type { Project } from "@/lib/types";
import { ConfirmButton } from "./confirm-button";
import { ProjectForm } from "./project-form";

export function ProjectActions({ project }: { project: Project }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  if (editing)
    return (
      <div className="card p-5">
        <h2 className="mb-4 text-2xl font-extrabold">edit project</h2>
        <ProjectForm project={project} onDone={() => setEditing(false)} />
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" onClick={() => setEditing(true)} className="btn-soft">
        edit project
      </button>
      <ConfirmButton
        label="delete project"
        confirmLabel="yes, delete it all"
        onConfirm={() =>
          start(async () => {
            const r = await deleteProject(project.id);
            if (r.ok) router.push("/projects");
            else setError(r.error);
          })
        }
      />
      {error && (
        <p role="alert" className="w-full text-sm font-bold text-berry">
          {error}
        </p>
      )}
      <p className="w-full text-sm text-ink-soft">deleting a project removes its routines and tasks too.</p>
    </div>
  );
}
