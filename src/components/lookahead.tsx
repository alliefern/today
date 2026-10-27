"use client";

import { useState, useTransition } from "react";
import { setLookahead } from "@/lib/actions";
import { lookaheadStatus, type LookaheadTone } from "@/lib/lookahead";

const TONE: Record<LookaheadTone, { card: string; bar: string; track: string }> = {
  unset: { card: "bg-blush text-ink", bar: "bg-berry", track: "bg-white" },
  great: { card: "bg-mint text-ink", bar: "bg-ink", track: "bg-white/70" },
  ok: { card: "bg-lilac text-ink", bar: "bg-ink", track: "bg-white/70" },
  low: { card: "bg-alert-pink text-ink", bar: "bg-berry-deep", track: "bg-white/70" },
  urgent: { card: "bg-berry-deep text-white", bar: "bg-white", track: "bg-white/30" },
};

export function Lookahead({ through, today }: { through: string | null; today: string }) {
  const s = lookaheadStatus(through, today);
  const tone = TONE[s.tone];
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(through ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      const r = await setLookahead(next);
      if (r.ok) setEditing(false);
      else setError(r.error);
    });
  }

  return (
    <section aria-label="gwd drops lookahead" className={`rounded-[1.75rem] p-5 ${tone.card}`}>
      <h2 className="text-base font-bold">gwd drops scheduled through</h2>
      <p className="mt-1 font-heading text-3xl font-extrabold leading-tight">{s.dateLabel ?? "—"}</p>
      <p className="mt-1 text-base font-semibold">
        {s.headline}. {s.message}
      </p>
      <div className={`mt-3 h-3 overflow-hidden rounded-full ${tone.track}`} aria-hidden>
        <div className={`h-full rounded-full transition-[width] duration-700 ${tone.bar}`} style={{ width: `${Math.round(s.pct * 100)}%` }} />
      </div>

      {editing ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value) save(value);
          }}
        >
          <label className="min-w-40 flex-1 text-sm font-bold">
            last scheduled day
            <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="field mt-1 bg-white text-ink" required />
          </label>
          <button className={s.tone === "urgent" ? "btn-soft" : "btn-primary"} disabled={pending || !value}>
            {pending ? "saving…" : "save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-ghost min-h-12">
            cancel
          </button>
          {error && (
            <p role="alert" className="w-full text-sm font-bold">
              {error}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setValue(through ?? "");
            setEditing(true);
          }}
          className="mt-4 min-h-11 rounded-full bg-white px-5 font-bold text-ink"
        >
          update
        </button>
      )}
    </section>
  );
}
