import type { ScheduleType } from "@/lib/types";

/**
 * day-one data. edit freely: this runs once for a brand new account (the app
 * seeds on first sign-in) or on demand with `npm run seed`.
 * titles are allie's own words, so they keep her capitalization.
 */

export interface SeedProject {
  key: string;
  name: string;
  color: string;
  emoji: string;
  link?: string;
  helper?: string;
}

export interface SeedRoutine {
  project: string; // SeedProject.key
  title: string;
  schedule_type: ScheduleType;
  weekdays?: number[]; // 0 = sunday
}

export const SEED_PROJECTS: SeedProject[] = [
  { key: "blog", name: "alliefern.com blog", color: "#FF6FA8", emoji: "📝", helper: "blog assistant" },
  { key: "coffee", name: "coffee & claude blog", color: "#C98B5B", emoji: "☕" },
  { key: "kate", name: "Kate Francis socials", color: "#A78BFA", emoji: "💌", helper: "KF Manager" },
  { key: "gwd-promo", name: "Girls Who Design promo", color: "#FF8A5B", emoji: "💅" },
  { key: "threads", name: "Threads", color: "#3DC1D3", emoji: "🧵", helper: "threadbot" },
  { key: "roo", name: "game with Roo", color: "#5BD68A", emoji: "🎮" },
  { key: "deploy", name: "Deploy Safely", color: "#F5B82E", emoji: "🛟", link: "https://deploysafely.com" },
  { key: "optins", name: "daily claude opt-ins", color: "#7C9CFF", emoji: "✨" },
  { key: "gwd-daily", name: "GWD daily prompt drops", color: "#F472D0", emoji: "🍒" },
  { key: "gwd-weekly", name: "GWD weekly premium drops", color: "#E0457B", emoji: "💎" },
  { key: "fiona", name: "Fiona's website", color: "#34C3A0", emoji: "🌷" },
];

export const SEED_ROUTINES: SeedRoutine[] = [
  // every day
  { project: "gwd-daily", title: "check that today's 9am GWD prompt drop went out", schedule_type: "daily" },
  { project: "threads", title: "post whatever threadbot sent", schedule_type: "daily" },
  { project: "kate", title: "check in with KF Manager and approve or post Kate's content", schedule_type: "daily" },
  { project: "optins", title: "do today's daily claude opt-in", schedule_type: "daily" },
  { project: "deploy", title: "quick look at Deploy Safely (CEO's posts and anything odd in the app)", schedule_type: "daily" },
  // one day a week
  { project: "gwd-weekly", title: "GWD premium drop goes out today", schedule_type: "weekly", weekdays: [1] },
  { project: "blog", title: "alliefern.com blog check-in with the blog assistant", schedule_type: "weekly", weekdays: [2] },
  { project: "coffee", title: "coffee & claude blog check-in", schedule_type: "weekly", weekdays: [4] },
  { project: "gwd-weekly", title: "post the teaser for Monday's premium drop", schedule_type: "weekly", weekdays: [5] },
  { project: "gwd-daily", title: "schedule a week of GWD prompt drops so I stay a month ahead", schedule_type: "weekly", weekdays: [0] },
  // bonus
  { project: "roo", title: "work on the game with Roo", schedule_type: "bonus" },
];

export interface SeedOneOff {
  project: string;
  title: string;
  date: string;
  sticky?: boolean;
}

/** `today` is yyyy-mm-dd in the user's time zone */
export function seedOneOffs(today: string): SeedOneOff[] {
  return [
    {
      project: "gwd-daily",
      title: "big batch: schedule GWD drops through the end of November",
      date: "2026-11-01",
    },
    // shows up every day until it is ticked off
    { project: "fiona", title: "build Fiona's website", date: today, sticky: true },
  ];
}
