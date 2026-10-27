"use client";

import { useEffect, useState, useTransition } from "react";
import { updateSettings } from "@/lib/actions";
import { WEEKDAY_NAMES } from "@/lib/schedule";
import type { CarryOver } from "@/lib/types";

const CARRY: { value: CarryOver; title: string; body: string }[] = [
  { value: "ask", title: "ask me", body: "unfinished things from yesterday wait in a small tray. you choose what comes along." },
  { value: "auto", title: "bring them along", body: "unfinished things move to today on their own. no tray, no decisions." },
  { value: "never", title: "fresh start", body: "yesterday stays yesterday. every day begins clean." },
];

export function SettingsForm({ initial }: { initial: { carry_over: CarryOver; week_start: number; timezone: string } }) {
  const [carry, setCarry] = useState(initial.carry_over);
  const [weekStart, setWeekStart] = useState(initial.week_start);
  const [tz, setTz] = useState(initial.timezone);
  const [zones, setZones] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      setZones(Intl.supportedValuesOf("timeZone"));
    } catch {
      setZones([]);
    }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await updateSettings({ carry_over: carry, week_start: weekStart, timezone: tz.trim() });
      setMsg(r.ok ? { ok: true, text: "saved ✨" } : { ok: false, text: r.error });
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="card space-y-3 p-5">
        <legend className="float-left mb-3 w-full text-2xl font-extrabold">unfinished things</legend>
        <div className="clear-both space-y-2">
          {CARRY.map((c) => (
            <label key={c.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 ${carry === c.value ? "bg-blush" : "bg-cream"}`}>
              <input type="radio" name="carry" checked={carry === c.value} onChange={() => setCarry(c.value)} className="mt-1 size-6 shrink-0 accent-berry" />
              <span>
                <span className="block font-bold">{c.title}</span>
                <span className="block text-sm text-ink-soft">{c.body}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-sm text-ink-soft">either way, routines come back on their own days, and bonus items never count as unfinished.</p>
      </fieldset>

      <section className="card space-y-4 p-5" aria-labelledby="calendar">
        <h2 id="calendar" className="text-2xl font-extrabold">calendar</h2>
        <label className="block text-sm font-bold">
          week starts on
          <select value={weekStart} onChange={(e) => setWeekStart(Number(e.target.value))} className="field mt-1 font-normal">
            {WEEKDAY_NAMES.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          time zone
          <input value={tz} onChange={(e) => setTz(e.target.value)} list="zones" autoCapitalize="off" autoCorrect="off" spellCheck={false} className="field mt-1 font-normal" />
          <datalist id="zones">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          <span className="mt-1 block text-sm font-normal text-ink-soft">this decides when "today" flips over. there are no times anywhere else in the app.</span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "saving…" : "save settings"}
        </button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm font-bold ${msg.ok ? "" : "text-berry"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
