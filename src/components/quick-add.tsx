"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";

export interface NewTask {
  title: string;
  projectId: string | null;
  when: "today" | "tomorrow" | string; // or an iso date
  bonus: boolean;
}

export function QuickAdd({
  projects,
  inputRef,
  onAdd,
}: {
  projects: Project[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onAdd: (t: NewTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [when, setWhen] = useState("today");
  const [date, setDate] = useState("");
  const [bonus, setBonus] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd({ title: t, projectId: projectId || null, when: when === "date" ? date || "today" : when, bonus });
    setTitle("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="card p-3" aria-label="add a one-off task">
      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">add a one-off task</span>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="add something for today…"
            maxLength={300}
            enterKeyHint="done"
            className="field"
          />
        </label>
        <button className="btn-primary shrink-0 px-5" aria-label="add task" disabled={!title.trim()}>
          add
        </button>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 min-h-9 rounded-full px-3 text-sm font-semibold underline underline-offset-4"
      >
        {open ? "fewer options" : "options"}
      </button>
      {open && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            project
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field mt-1">
              <option value="">no project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            for
            <select value={when} onChange={(e) => setWhen(e.target.value)} className="field mt-1">
              <option value="today">today</option>
              <option value="tomorrow">tomorrow</option>
              <option value="date">pick a date…</option>
            </select>
          </label>
          {when === "date" && (
            <label className="block text-sm font-semibold">
              date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field mt-1" />
            </label>
          )}
          <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={bonus}
              onChange={(e) => setBonus(e.target.checked)}
              className="size-6 accent-berry"
            />
            bonus (only if there's extra time)
          </label>
        </div>
      )}
    </form>
  );
}
