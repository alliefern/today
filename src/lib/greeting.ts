import { diffDays } from "./dates";

/** lowercase on purpose: all interface copy is */
export function greeting(hour: number, name: string): string {
  if (hour < 5) return `still up, ${name}?`;
  if (hour < 12) return `good morning, ${name}`;
  if (hour < 17) return `good afternoon, ${name}`;
  if (hour < 22) return `good evening, ${name}`;
  return `hi night owl, ${name}`;
}

const SUBLINES = [
  "one list. no planning. that's the whole job.",
  "you don't have to decide anything today. it's all here.",
  "tick it off, then go be a person.",
  "future you already thanked you.",
  "you built the system so you could stop thinking about it.",
  "small checklist, big main-character energy.",
  "do the list, ignore the noise.",
  "nothing here is on fire. promise.",
];

/** a stable pick per calendar day, so it doesn't change on every refresh */
export function subline(isoDate: string): string {
  return SUBLINES[Math.abs(diffDays("2026-01-01", isoDate)) % SUBLINES.length];
}
