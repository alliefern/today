"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProject, updateProject } from "@/lib/actions";
import type { Project } from "@/lib/types";

const SWATCHES = ["#FF6FA8", "#F472D0", "#E0457B", "#FF8A5B", "#F5B82E", "#5BD68A", "#34C3A0", "#3DC1D3", "#7C9CFF", "#A78BFA", "#C98B5B"];
const EMOJI = ["✨", "📝", "☕", "💌", "💅", "🧵", "🎮", "🛟", "🍒", "💎", "🌷", "🚀", "🎀", "🌈"];

export function ProjectForm({ project, onDone }: { project?: Project; onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(project?.name ?? "");
  const [emoji, setEmoji] = useState(project?.emoji ?? "✨");
  const [color, setColor] = useState(project?.color ?? SWATCHES[0]);
  const [link, setLink] = useState(project?.link ?? "");
  const [helper, setHelper] = useState(project?.helper ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const input = { name, emoji, color, link, helper };
      if (project) {
        const r = await updateProject(project.id, input);
        if (!r.ok) return setError(r.error);
        onDone?.();
        router.refresh();
      } else {
        const r = await createProject(input);
        if (!r.ok) return setError(r.error);
        onDone?.();
        router.push(r.id ? `/projects/${r.id}` : "/projects");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-bold">
        name
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className="field mt-1 font-normal" />
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-bold">emoji</legend>
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={16} className="field w-20 text-center text-2xl" />
          {EMOJI.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} aria-label={`use ${e}`} aria-pressed={emoji === e} className={`grid size-11 place-items-center rounded-xl text-xl ${emoji === e ? "bg-berry" : "bg-blush"}`}>
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-bold">color</legend>
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`color ${c}`} aria-pressed={color === c} style={{ background: c }} className={`size-11 rounded-full ${color === c ? "ring-4 ring-ink ring-offset-2 ring-offset-white" : ""}`} />
          ))}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="custom color" className="size-11 rounded-full bg-transparent" />
            custom
          </label>
        </div>
      </fieldset>

      <label className="block text-sm font-bold">
        link <span className="font-normal text-ink-soft">(optional: site, skool, app)</span>
        <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://" className="field mt-1 font-normal" />
      </label>

      <label className="block text-sm font-bold">
        helper <span className="font-normal text-ink-soft">(optional: the assistant who handles it)</span>
        <input value={helper} onChange={(e) => setHelper(e.target.value)} maxLength={80} placeholder="threadbot, KF Manager…" className="field mt-1 font-normal" />
      </label>

      {error && (
        <p role="alert" className="text-sm font-bold text-berry">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending || !name.trim()}>
          {pending ? "saving…" : project ? "save project" : "create project"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="btn-ghost">
            cancel
          </button>
        )}
      </div>
    </form>
  );
}
