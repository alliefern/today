"use client";

import { useState } from "react";
import { ProjectForm } from "./project-form";

export function NewProject() {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
        + new project
      </button>
    );
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-2xl font-extrabold">new project</h2>
      <ProjectForm onDone={() => setOpen(false)} />
    </div>
  );
}
