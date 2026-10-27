import Link from "next/link";
import { Lookahead } from "@/components/lookahead";
import { TodayView } from "@/components/today-view";
import { loadToday } from "@/lib/data";
import { diffDays, formatLong, formatWeekday, hourIn } from "@/lib/dates";
import { greeting, subline } from "@/lib/greeting";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export default async function TodayPage() {
  if (!supabaseEnv()) return null; // the layout explains how to connect a database
  const db = await createClient();
  const data = await loadToday(db);
  const { today, settings } = data;

  if (data.projects.length === 0) {
    return (
      <div className="card mt-6 space-y-3 p-6">
        <h1 className="text-3xl font-extrabold">a blank slate 🌱</h1>
        <p>no projects yet, so there's nothing to build a list from. add your first project and a routine, and tomorrow's list builds itself.</p>
        <Link href="/projects" className="btn-primary">
          add a project
        </Link>
      </div>
    );
  }

  const routineSort = Object.fromEntries(data.routines.map((r) => [r.id, r.sort]));
  const tray = data.tray && {
    ...data.tray,
    label: diffDays(data.tray.date, today) === 1 ? "yesterday" : formatWeekday(data.tray.date),
  };

  return (
    <TodayView
      today={today}
      dateLabel={formatLong(today)}
      greeting={greeting(hourIn(settings.timezone), (process.env.OWNER_NAME ?? "allie").toLowerCase())}
      subline={subline(today)}
      projects={data.projects}
      routineSort={routineSort}
      tasks={data.tasks}
      tray={tray}
      streak={data.streak}
    >
      <Lookahead through={settings.gwd_scheduled_through} today={today} />
    </TodayView>
  );
}
