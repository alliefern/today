"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
  addTask,
  bringToToday,
  deleteTask,
  letGo,
  setBonus,
  snoozeTask,
  toggleDone,
  undoSnooze,
  type Result,
} from "@/lib/actions";
import { addDays } from "@/lib/dates";
import { groupTasks, LOOSE_ENDS } from "@/lib/group";
import type { Project, Task } from "@/lib/types";
import { Confetti } from "./confetti";
import { FromYesterday } from "./from-yesterday";
import { ProgressRing } from "./progress-ring";
import { QuickAdd, type NewTask } from "./quick-add";
import { TaskRow } from "./task-row";

interface Tray {
  date: string;
  label: string;
  items: Task[];
}

type State = { tasks: Task[]; tray: Tray | null };
type Act =
  | { type: "toggle"; id: string; done: boolean }
  | { type: "remove"; id: string }
  | { type: "bonus"; id: string; bonus: boolean }
  | { type: "add"; task: Task }
  | { type: "put"; task: Task }
  | { type: "tray"; ids: string[]; bring: boolean };

function reduce(state: State, a: Act): State {
  switch (a.type) {
    case "toggle":
      return { ...state, tasks: state.tasks.map((t) => (t.id === a.id ? { ...t, done_at: a.done ? new Date().toISOString() : null } : t)) };
    case "remove":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== a.id) };
    case "bonus":
      return { ...state, tasks: state.tasks.map((t) => (t.id === a.id ? { ...t, bonus: a.bonus } : t)) };
    case "add":
      return { ...state, tasks: [...state.tasks, a.task] };
    case "put":
      return { ...state, tasks: [...state.tasks.filter((t) => t.id !== a.task.id), a.task] };
    case "tray": {
      if (!state.tray) return state;
      const moved = state.tray.items.filter((t) => a.ids.includes(t.id));
      const rest = state.tray.items.filter((t) => !a.ids.includes(t.id));
      return {
        tasks: a.bring ? [...state.tasks, ...moved] : state.tasks,
        tray: rest.length ? { ...state.tray, items: rest } : null,
      };
    }
  }
}

interface Toast {
  text: string;
  undo?: () => void;
}

export function TodayView(props: {
  today: string;
  dateLabel: string;
  greeting: string;
  subline: string;
  projects: Project[];
  routineSort: Record<string, number>;
  tasks: Task[];
  tray: Tray | null;
  streak: number;
  children?: React.ReactNode; // the lookahead widget
}) {
  const { today, projects, routineSort } = props;
  const [state, apply] = useOptimistic<State, Act>({ tasks: props.tasks, tray: props.tray }, reduce);
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const [burst, setBurst] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kbd, setKbd] = useState(false);
  const quickRef = useRef<HTMLInputElement | null>(null);

  const main = state.tasks.filter((t) => !t.bonus);
  const bonus = state.tasks.filter((t) => t.bonus);
  const total = main.length;
  const done = main.filter((t) => t.done_at).length;
  const allDone = done === total;

  const mainGroups = useMemo(() => groupTasks(main, projects, routineSort), [main, projects, routineSort]);
  const bonusGroups = useMemo(() => groupTasks(bonus, projects, routineSort), [bonus, projects, routineSort]);

  // keyboard order: the main list top to bottom, then bonus
  const order = useMemo(
    () => [...mainGroups, ...bonusGroups].flatMap((g) => g.tasks.map((t) => t.id)),
    [mainGroups, bonusGroups],
  );
  const firstOpen = [...mainGroups, ...bonusGroups].flatMap((g) => g.tasks).find((t) => !t.done_at)?.id ?? order[0];
  const selected = selectedId && order.includes(selectedId) ? selectedId : firstOpen;

  // confetti only when *this session* finishes the list, not on every load
  const wasDone = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasDone.current && total > 0) setBurst((n) => n + 1);
    wasDone.current = allDone;
  }, [allDone, total]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.undo ? 7000 : 5000);
    return () => clearTimeout(id);
  }, [toast]);

  function act(a: Act, call: () => Promise<Result>, onError = "that didn't save") {
    startTransition(async () => {
      apply(a);
      const r = await call();
      if (!r.ok) setToast({ text: `${onError}: ${r.error}` });
    });
  }

  const find = (id: string) => state.tasks.find((t) => t.id === id);

  function toggle(id: string) {
    const t = find(id);
    if (!t) return;
    const next = !t.done_at;
    act({ type: "toggle", id, done: next }, () => toggleDone(id, next));
  }

  function snooze(id: string) {
    const t = find(id);
    if (!t) return;
    act({ type: "remove", id }, () => snoozeTask(id));
    setToast({
      text: "moved to tomorrow",
      undo: () => act({ type: "put", task: t }, () => undoSnooze(id, t.date)),
    });
  }

  function toBonus(id: string) {
    const t = find(id);
    if (!t) return;
    const next = !t.bonus;
    act({ type: "bonus", id, bonus: next }, () => setBonus(id, next));
    setToast({
      text: next ? "moved to bonus" : "back on the list",
      undo: () => act({ type: "bonus", id, bonus: !next }, () => setBonus(id, !next)),
    });
  }

  function remove(id: string) {
    const t = find(id);
    if (!t) return;
    act({ type: "remove", id }, () => deleteTask(id));
    setToast({ text: "removed" });
  }

  function add(n: NewTask) {
    const date = n.when === "today" ? today : n.when === "tomorrow" ? addDays(today, 1) : n.when;
    const call = () => addTask({ title: n.title, projectId: n.projectId, date, bonus: n.bonus });
    if (date === today) {
      const temp: Task = {
        id: `temp-${Date.now()}`,
        project_id: n.projectId,
        routine_id: null,
        title: n.title,
        date,
        bonus: n.bonus,
        sticky: false,
        done_at: null,
        dismissed_at: null,
        created_at: new Date().toISOString(),
      };
      act({ type: "add", task: temp }, call, "couldn't add that");
    } else {
      startTransition(async () => {
        const r = await call();
        setToast({ text: r.ok ? `added for ${n.when === "tomorrow" ? "tomorrow" : "later"}` : `couldn't add that: ${r.error}` });
      });
    }
  }

  // ---- keyboard: n new, space check, t tomorrow, b bonus, x remove, j/k or arrows move, ? help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      setKbd(true);
      const el = e.target as HTMLElement;
      const typing = el.matches("input, textarea, select, [contenteditable='true']");
      if (typing) {
        if (e.key === "Escape") el.blur();
        return;
      }
      const onControl = el.closest("button, a, summary");
      const move = (dir: 1 | -1) => {
        const i = Math.max(0, order.indexOf(selected ?? ""));
        const next = order[Math.min(order.length - 1, Math.max(0, i + dir))];
        if (next) {
          setSelectedId(next);
          document.querySelector(`[data-task="${next}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      };
      switch (e.key) {
        case "n":
          e.preventDefault();
          quickRef.current?.focus();
          break;
        case " ":
          if (onControl || !selected) return; // let a focused button handle its own space
          e.preventDefault();
          toggle(selected);
          break;
        case "t":
          if (selected) snooze(selected);
          break;
        case "b":
          if (selected) toBonus(selected);
          break;
        case "x":
        case "Delete":
          if (selected) remove(selected);
          break;
        case "j":
        case "ArrowDown":
          if (onControl && e.key === "ArrowDown") return;
          e.preventDefault();
          move(1);
          break;
        case "k":
        case "ArrowUp":
          if (onControl && e.key === "ArrowUp") return;
          e.preventDefault();
          move(-1);
          break;
      }
    };
    const onPointer = () => setKbd(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  });

  const renderGroup = (g: ReturnType<typeof groupTasks>[number], isBonus: boolean) => {
    const p = g.project ?? LOOSE_ENDS;
    const open = g.tasks.filter((t) => !t.done_at).length;
    return (
      <section key={`${isBonus ? "b" : "m"}-${p.id}`} aria-label={p.name} style={{ "--c": p.color } as React.CSSProperties}>
        <header className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1">
          <span className="chip-bg grid size-9 place-items-center rounded-xl text-xl" aria-hidden>
            {p.emoji}
          </span>
          <h2 className="min-w-0 text-lg font-bold leading-tight">{p.name}</h2>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-sm font-bold">
            {open === 0 ? "all done ✓" : `${g.tasks.length - open}/${g.tasks.length}`}
            {p.link && (
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`open ${p.name} link (new tab)`}
                className="grid size-9 place-items-center rounded-full text-lg"
              >
                ↗
              </a>
            )}
          </span>
          {p.helper && <p className="w-full pl-11 text-sm text-ink-soft">with {p.helper}</p>}
        </header>
        <ul className="tint space-y-1 rounded-[1.75rem] p-1.5">
          {g.tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              selected={kbd && selected === t.id}
              onSelect={() => setSelectedId(t.id)}
              onToggle={() => toggle(t.id)}
              onSnooze={() => snooze(t.id)}
              onBonus={() => toBonus(t.id)}
              onRemove={t.routine_id ? undefined : () => remove(t.id)}
            />
          ))}
        </ul>
      </section>
    );
  };

  const checklist = <div className="space-y-6">{mainGroups.map((g) => renderGroup(g, false))}</div>;

  return (
    <div className={`space-y-5 ${kbd ? "kbd" : ""}`}>
      {burst > 0 && <Confetti key={burst} />}

      <header className="flex items-center gap-4 rounded-[2rem] bg-plum p-6 text-white">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{props.dateLabel}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">{props.greeting}</h1>
          <p className="mt-2 text-base">{props.subline}</p>
        </div>
        <ProgressRing done={done} total={total} />
      </header>

      <QuickAdd projects={projects} inputRef={quickRef} onAdd={add} />

      {state.tray && (
        <FromYesterday
          label={state.tray.label}
          items={state.tray.items}
          projects={projects}
          onBring={(ids) => act({ type: "tray", ids, bring: true }, () => bringToToday(ids))}
          onLetGo={(ids) => act({ type: "tray", ids, bring: false }, () => letGo(ids))}
        />
      )}

      {allDone ? (
        <>
          <section className="card row-in px-6 py-10 text-center" aria-live="polite">
            <div className="wiggle text-7xl" aria-hidden>
              🌸
            </div>
            <h2 className="mt-4 text-4xl font-extrabold">{total === 0 ? "nothing on today." : "you're done."}</h2>
            <p className="mt-1 text-2xl font-bold text-berry">go live your life.</p>
            {props.streak >= 2 && state.tasks.length > 0 && (
              <p className="mt-4 text-base text-ink-soft">
                that's {props.streak} days in a row of finishing everything. iconic. ✨
              </p>
            )}
          </section>
          {total > 0 && (
            <details className="rounded-3xl">
              <summary className="min-h-12 cursor-pointer rounded-2xl px-3 py-3 font-bold">peek at what you did</summary>
              <div className="mt-3">{checklist}</div>
            </details>
          )}
        </>
      ) : (
        checklist
      )}

      {bonus.length > 0 && (
        <section aria-label="bonus" className="space-y-3 pt-2">
          <div className="px-1">
            <h2 className="text-xl font-extrabold">bonus</h2>
            <p className="text-sm text-ink-soft">only if you've got extra time. never counts against you.</p>
          </div>
          <div className="space-y-6">{bonusGroups.map((g) => renderGroup(g, true))}</div>
        </section>
      )}

      {props.children}

      <footer className="space-y-2 px-1 pb-2 text-sm text-ink-soft">
        <p>
          <span aria-hidden>✓</span> tap to finish · <span aria-hidden>→</span> push to tomorrow · <span aria-hidden>★</span> move to bonus
        </p>
        <p className="hidden sm:block">
          keys: <kbd className="font-mono">n</kbd> new · <kbd className="font-mono">space</kbd> check · <kbd className="font-mono">t</kbd> tomorrow ·{" "}
          <kbd className="font-mono">b</kbd> bonus · <kbd className="font-mono">x</kbd> remove · <kbd className="font-mono">j</kbd>/<kbd className="font-mono">k</kbd> move
        </p>
      </footer>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 px-5">
        <div className="mx-auto max-w-[36rem]">
          {toast && (
            <div className="pointer-events-auto row-in flex items-center gap-3 rounded-full bg-plum py-2 pl-5 pr-2 text-white shadow-xl">
              <span className="min-w-0 flex-1 text-sm font-semibold">{toast.text}</span>
              {toast.undo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.undo?.();
                    setToast(null);
                  }}
                  className="min-h-11 rounded-full bg-white px-4 text-sm font-bold text-ink"
                >
                  undo
                </button>
              )}
              <button type="button" onClick={() => setToast(null)} aria-label="dismiss message" className="grid size-11 place-items-center rounded-full text-lg">
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
