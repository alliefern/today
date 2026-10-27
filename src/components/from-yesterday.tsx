"use client";

import { useState } from "react";
import type { Project, Task } from "@/lib/types";

/**
 * the tray. small, closed by default, and never mixed into today's list.
 * nothing in here counts against you.
 */
export function FromYesterday({
  label,
  items,
  projects,
  onBring,
  onLetGo,
}: {
  label: string; // "yesterday" or a weekday name
  items: Task[];
  projects: Project[];
  onBring: (ids: string[]) => void;
  onLetGo: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ids = items.map((t) => t.id);
  const emoji = (t: Task) => projects.find((p) => p.id === t.project_id)?.emoji ?? "🫧";

  return (
    <section aria-label={`from ${label}`} className="rounded-3xl bg-lilac p-3 row-in">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl px-2 text-left font-bold"
        >
          <span aria-hidden>🌙</span>
          from {label}?
          <span className="rounded-full bg-white px-2 py-0.5 text-sm">{items.length}</span>
          <span aria-hidden className="ml-auto text-lg">{open ? "–" : "+"}</span>
        </button>
        <button
          type="button"
          onClick={() => onLetGo(ids)}
          className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold underline underline-offset-4"
          aria-label={`dismiss all ${items.length} from ${label}`}
        >
          dismiss
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-2xl bg-white p-2 pl-3">
                <span aria-hidden>{emoji(t)}</span>
                <span className="min-w-0 flex-1 text-sm">{t.title}</span>
                <button type="button" onClick={() => onBring([t.id])} className="btn-soft min-h-10 px-3 text-sm">
                  bring to today
                </button>
                <button
                  type="button"
                  onClick={() => onLetGo([t.id])}
                  className="min-h-10 rounded-full px-2 text-sm font-semibold underline underline-offset-4"
                >
                  let go
                </button>
              </li>
            ))}
          </ul>
          {items.length > 1 && (
            <button type="button" onClick={() => onBring(ids)} className="btn-primary min-h-11 w-full text-sm">
              bring all {items.length} to today
            </button>
          )}
        </div>
      )}
    </section>
  );
}
