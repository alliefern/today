"use client";

import { useState, useTransition } from "react";
import { createRoutine, updateRoutine } from "@/lib/actions";
import { SCHEDULE_LABELS, WEEKDAY_SHORT } from "@/lib/schedule";
import type { Routine, ScheduleType } from "@/lib/types";

const TYPES: ScheduleType[] = ["daily", "weekdays", "weekly", "monthly", "bonus"];

export function RoutineForm({ projectId, routine, onDone }: { projectId: string; routine?: Routine; onDone?: () => void }) {
  const [title, setTitle] = useState(routine?.title ?? "");
  const [type, setType] = useState<ScheduleType>(routine?.schedule_type ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? []);
  const [dom, setDom] = useState<number>(routine?.day_of_month ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pickDay(d: number) {
    if (type === "weekly") return setWeekdays([d]);
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const input = { projectId, title, schedule_type: type, weekdays, day_of_month: type === "monthly" ? dom : null };
      const r = routine ? await updateRoutine(routine.id, input) : await createRoutine(input);
      if (!r.ok) return setError(r.error);
      if (!routine) {
        setTitle("");
        setWeekdays([]);
      }
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-bold">
        what needs doing?
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="e.g. check the 9am drop went out" className="field mt-1 font-normal" />
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-bold">how often?</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`min-h-11 rounded-full px-4 text-sm font-bold ${type === t ? "bg-berry text-white" : "bg-blush text-ink"}`}>
              {SCHEDULE_LABELS[t]}
            </button>
          ))}
        </div>
      </fieldset>

      {(type === "weekdays" || type === "weekly") && (
        <fieldset>
          <legend className="mb-1 text-sm font-bold">{type === "weekly" ? "which day?" : "which days?"}</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_SHORT.map((label, d) => (
              <button key={label} type="button" aria-pressed={weekdays.includes(d)} onClick={() => pickDay(d)} className={`min-h-11 min-w-14 rounded-full px-3 text-sm font-bold ${weekdays.includes(d) ? "bg-berry text-white" : "bg-blush text-ink"}`}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {type === "monthly" && (
        <label className="block text-sm font-bold">
          which date?
          <select value={dom} onChange={(e) => setDom(Number(e.target.value))} className="field mt-1 w-40 font-normal">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-sm font-normal text-ink-soft">short month? it lands on the last day.</span>
        </label>
      )}

      {type === "bonus" && <p className="text-sm text-ink-soft">bonus routines wait on your bonus list every day. they never count as unfinished.</p>}

      {error && (
        <p role="alert" className="text-sm font-bold text-berry">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending || !title.trim()}>
          {pending ? "saving…" : routine ? "save routine" : "add routine"}
        </button>
        {onDone && routine && (
          <button type="button" onClick={onDone} className="btn-ghost">
            cancel
          </button>
        )}
      </div>
    </form>
  );
}
