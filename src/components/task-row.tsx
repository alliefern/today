"use client";

import type { Task } from "@/lib/types";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const TOMORROW = "M5 12h14m-6-6l6 6-6 6";
const STAR = "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z";
const UP = "M12 19V5m-6 6l6-6 6 6";

export function TaskRow({
  task,
  selected,
  onSelect,
  onToggle,
  onSnooze,
  onBonus,
  onRemove,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onSnooze: () => void;
  onBonus: () => void;
  /** only for one-offs; routine rows are managed from the project page */
  onRemove?: () => void;
}) {
  const done = !!task.done_at;
  return (
    <li
      data-task={task.id}
      data-selected={selected || undefined}
      className={`row-in flex items-stretch gap-1 rounded-[1.25rem] bg-white/70 p-1 ${selected ? "kbd-selected" : ""}`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
      <button
        type="button"
        aria-pressed={done}
        onClick={onToggle}
        onFocus={onSelect}
        className="flex min-h-[4.25rem] w-full min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left"
      >
        <span
          aria-hidden
          className="check grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-white data-[on=true]:border-berry data-[on=true]:bg-berry"
          data-on={done}
        >
          <svg viewBox="0 0 24 24" className={`size-6 ${done ? "" : "opacity-0"}`} fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path className="tick" d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <span className={`min-w-0 text-[1.05rem] leading-snug transition-opacity ${done ? "line-through opacity-70" : "font-medium"}`}>
          {task.sticky && !done && <span className="mr-1.5 rounded-full bg-plum px-2 py-0.5 align-middle text-xs font-bold text-white">until done</span>}
          {task.title}
        </span>
        <span className="sr-only">{done ? "(done. press to undo)" : ""}</span>
      </button>
      {onRemove && !done && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`remove: ${task.title}`}
          className="-mt-1 mb-1 ml-[3.5rem] min-h-8 self-start rounded-lg px-1 text-sm font-semibold text-ink-soft underline underline-offset-4"
        >
          remove
        </button>
      )}
      </div>
      {!done && (
        <div className="flex shrink-0 flex-col justify-center">
          <button
            type="button"
            onClick={onSnooze}
            aria-label={`move to tomorrow: ${task.title}`}
            title="tomorrow (t)"
            className="grid h-9 w-11 place-items-center rounded-xl"
          >
            <Icon d={TOMORROW} />
          </button>
          <button
            type="button"
            onClick={onBonus}
            aria-label={task.bonus ? `move to today's list: ${task.title}` : `move to bonus: ${task.title}`}
            title={task.bonus ? "back to the list (b)" : "bonus (b)"}
            className="grid h-9 w-11 place-items-center rounded-xl"
          >
            <Icon d={task.bonus ? UP : STAR} />
          </button>
        </div>
      )}
    </li>
  );
}
