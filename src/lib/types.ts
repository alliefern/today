export type ScheduleType = "daily" | "weekdays" | "weekly" | "monthly" | "bonus";
export type CarryOver = "auto" | "ask" | "never";

export interface Project {
  id: string;
  name: string;
  color: string; // #rrggbb
  emoji: string;
  link: string | null;
  helper: string | null;
  sort: number;
}

export interface Routine {
  id: string;
  project_id: string;
  title: string;
  schedule_type: ScheduleType;
  /** 0 = sunday ... 6 = saturday. used by "weekdays" and "weekly". */
  weekdays: number[];
  /** 1-31, used by "monthly". 31 means "last day" in short months. */
  day_of_month: number | null;
  active: boolean;
  sort: number;
}

export interface Task {
  id: string;
  project_id: string | null;
  routine_id: string | null;
  title: string;
  /** the day it lives on, yyyy-mm-dd in the user's time zone */
  date: string;
  bonus: boolean;
  /** one-off that shows up every day until it is ticked */
  sticky: boolean;
  done_at: string | null;
  dismissed_at: string | null;
  created_at?: string;
}

export interface Settings {
  carry_over: CarryOver;
  /** 0 = sunday ... 6 = saturday */
  week_start: number;
  timezone: string;
  gwd_scheduled_through: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  carry_over: "ask",
  week_start: 1,
  timezone: "Europe/London",
  gwd_scheduled_through: null,
};

/** one row on a day's checklist, real (a task row) or a preview (not created yet) */
export interface DayItem {
  key: string;
  id: string | null;
  title: string;
  project_id: string | null;
  routine_id: string | null;
  bonus: boolean;
  sticky: boolean;
  done: boolean;
}
