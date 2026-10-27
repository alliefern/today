import Link from "next/link";
import { Lookahead } from "@/components/lookahead";
import { listOpenSticky, listProjects, listRoutines, listTasksBetween, getSettings } from "@/lib/data";
import { addDays, formatMonthDay, formatWeekday, todayIn, weekDates } from "@/lib/dates";
import { buildDay } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type { DayItem, Project, Routine } from "@/lib/types";

export const metadata = { title: "week · today" };

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  if (!supabaseEnv()) return null; // the layout explains how to connect a database
  const offset = Math.max(-8, Math.min(26, Number.parseInt(w ?? "0", 10) || 0));

  const db = await createClient();
  const settings = await getSettings(db);
  const today = todayIn(settings.timezone);
  const dates = weekDates(addDays(today, offset * 7), settings.week_start);

  const [projects, routines, tasks, stickyOpen] = await Promise.all([
    listProjects(db),
    listRoutines(db),
    listTasksBetween(db, dates[0], dates[6]),
    listOpenSticky(db),
  ]);
  const routineById = new Map(routines.map((r) => [r.id, r]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-4xl font-extrabold">the week</h1>
        <p className="mt-1 text-lg text-ink-soft">
          {formatMonthDay(dates[0])} – {formatMonthDay(dates[6])}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
          <Link href={`/week?w=${offset - 1}`} className="btn-soft min-h-11 px-4">
            ← earlier
          </Link>
          {offset !== 0 && (
            <Link href="/week" className="btn-soft min-h-11 px-4">
              this week
            </Link>
          )}
          <Link href={`/week?w=${offset + 1}`} className="btn-soft min-h-11 px-4">
            later →
          </Link>
        </div>
      </header>

      <div className="space-y-4">
        {dates.map((date) => {
          const items = buildDay({ date, today, routines, tasks, stickyOpen });
          return (
            <DayCard key={date} date={date} isToday={date === today} isPast={date < today} items={items} routineById={routineById} projectById={projectById} />
          );
        })}
      </div>

      <Lookahead through={settings.gwd_scheduled_through} today={today} />
    </div>
  );
}

function DayCard({
  date,
  isToday,
  isPast,
  items,
  routineById,
  projectById,
}: {
  date: string;
  isToday: boolean;
  isPast: boolean;
  items: DayItem[];
  routineById: Map<string, Routine>;
  projectById: Map<string, Project>;
}) {
  const main = items.filter((i) => !i.bonus);
  const bonus = items.filter((i) => i.bonus);
  const isDaily = (i: DayItem) => !!i.routine_id && routineById.get(i.routine_id)?.schedule_type === "daily";
  const dailies = main.filter(isDaily);
  const specials = main.filter((i) => !isDaily(i));
  const doneCount = main.filter((i) => i.done).length;
  const rank = (i: DayItem) => projectById.get(i.project_id ?? "")?.sort ?? 999;
  specials.sort((a, b) => rank(a) - rank(b));

  const dark = isToday;
  return (
    <section
      aria-label={`${formatWeekday(date)}, ${formatMonthDay(date)}`}
      className={`rounded-[1.75rem] p-5 ${dark ? "bg-plum text-white" : "bg-white"} ${isPast ? "opacity-90" : ""}`}
    >
      <header className="flex items-baseline gap-2">
        <h2 className="text-xl font-extrabold">{formatWeekday(date)}</h2>
        <span className="text-base">{formatMonthDay(date)}</span>
        {isToday && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-ink">today</span>}
        <span className="ml-auto text-sm font-bold">
          {isPast || isToday ? (main.length === 0 ? "" : `${doneCount}/${main.length}`) : `${main.length} thing${main.length === 1 ? "" : "s"}`}
        </span>
      </header>

      {specials.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {specials.map((i) => (
            <Line key={i.key} item={i} project={projectById.get(i.project_id ?? "")} dark={dark} />
          ))}
        </ul>
      ) : (
        main.length === 0 && <p className="mt-3 text-base">{isPast ? "nothing was on." : "a clear day. enjoy it."}</p>
      )}

      {dailies.length > 0 && (
        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-xl text-sm font-bold underline underline-offset-4">
            + {dailies.length} every-day thing{dailies.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-2">
            {dailies.map((i) => (
              <Line key={i.key} item={i} project={projectById.get(i.project_id ?? "")} dark={dark} />
            ))}
          </ul>
        </details>
      )}

      {bonus.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="font-bold">bonus:</span> {bonus.map((b) => b.title).join(" · ")}
        </p>
      )}
    </section>
  );
}

function Line({ item, project, dark }: { item: DayItem; project?: Project; dark: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-base leading-snug">
      <span
        aria-hidden
        className={`grid size-7 shrink-0 place-items-center rounded-lg text-base ${dark ? "bg-white/15" : "chip-bg"}`}
        style={{ "--c": project?.color ?? "#A78BFA" } as React.CSSProperties}
      >
        {project?.emoji ?? "🫧"}
      </span>
      <span className={item.done ? "line-through opacity-80" : ""}>
        {item.title}
        {item.sticky && <span className="ml-1.5 text-xs font-bold">(until done)</span>}
        {item.done && <span className="sr-only"> (done)</span>}
      </span>
    </li>
  );
}
