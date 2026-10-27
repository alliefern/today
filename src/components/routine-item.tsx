"use client";

import { useState, useTransition } from "react";
import { deleteRoutine, setRoutineActive } from "@/lib/actions";
import { describeSchedule } from "@/lib/schedule";
import type { Routine } from "@/lib/types";
import { ConfirmButton } from "./confirm-button";
import { RoutineForm } from "./routine-form";

export function RoutineItem({ routine }: { routine: Routine }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean } & { error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "that didn't work");
    });

  if (editing) {
    return (
      <li className="rounded-3xl bg-white p-4">
        <RoutineForm projectId={routine.project_id} routine={routine} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`rounded-3xl bg-white p-4 ${routine.active ? "" : "opacity-85"}`}>
      <p className="text-base font-semibold leading-snug">{routine.title}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {describeSchedule(routine)}
        {!routine.active && <span className="ml-2 rounded-full bg-lilac px-2 py-0.5 font-bold text-ink">paused</span>}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-full px-4 text-sm font-bold underline underline-offset-4">
          edit
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => setRoutineActive(routine.id, !routine.active))} className="min-h-11 rounded-full px-4 text-sm font-bold underline underline-offset-4">
          {routine.active ? "pause" : "resume"}
        </button>
        <ConfirmButton label="remove" confirmLabel="yes, remove it" onConfirm={() => run(() => deleteRoutine(routine.id))} />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm font-bold text-berry">
          {error}
        </p>
      )}
    </li>
  );
}
