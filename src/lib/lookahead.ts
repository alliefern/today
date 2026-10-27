import { diffDays, formatFull } from "./dates";

export type LookaheadTone = "unset" | "great" | "ok" | "low" | "urgent";

export interface LookaheadStatus {
  tone: LookaheadTone;
  days: number | null;
  dateLabel: string | null;
  headline: string;
  message: string;
  /** 0-1, how close to the one-month goal */
  pct: number;
}

const GOAL_DAYS = 28; // "a month ahead"
const WARN_DAYS = 21; // under 3 weeks turns pink
const URGENT_DAYS = 7; // under a week goes deeper red

/** how far ahead the GWD drops are scheduled. kind wording, even when it's red. */
export function lookaheadStatus(through: string | null, today: string): LookaheadStatus {
  if (!through) {
    return {
      tone: "unset",
      days: null,
      dateLabel: null,
      headline: "not set yet",
      message: "tap update and tell me the last day that's scheduled.",
      pct: 0,
    };
  }
  const days = diffDays(today, through);
  const pct = Math.max(0, Math.min(1, days / GOAL_DAYS));
  const dateLabel = formatFull(through);
  if (days >= GOAL_DAYS)
    return { tone: "great", days, dateLabel, headline: `${days} days ahead`, message: "a month ahead. gorgeous.", pct };
  if (days >= WARN_DAYS)
    return { tone: "ok", days, dateLabel, headline: `${days} days ahead`, message: "over 3 weeks of runway. comfy.", pct };
  if (days >= URGENT_DAYS)
    return {
      tone: "low",
      days,
      dateLabel,
      headline: `${days} days ahead`,
      message: "under 3 weeks. sunday's a good day to top up.",
      pct,
    };
  return {
    tone: "urgent",
    days,
    dateLabel,
    headline: days > 0 ? `${days} day${days === 1 ? "" : "s"} ahead` : "caught up to today",
    message: days > 0 ? "running low. a batch session would feel so good." : "the schedule has run out. a batch session fixes it.",
    pct,
  };
}
