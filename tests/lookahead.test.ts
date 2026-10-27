import { describe, expect, it } from "vitest";
import { lookaheadStatus } from "@/lib/lookahead";

const today = "2026-10-27";

describe("lookahead tracker", () => {
  it("is neutral until you set a date", () => {
    expect(lookaheadStatus(null, today).tone).toBe("unset");
  });

  it("is happy at a month or more", () => {
    expect(lookaheadStatus("2026-11-24", today)).toMatchObject({ tone: "great", days: 28 });
  });

  it("turns pink under exactly 3 weeks", () => {
    expect(lookaheadStatus("2026-11-17", today)).toMatchObject({ tone: "ok", days: 21 });
    expect(lookaheadStatus("2026-11-16", today)).toMatchObject({ tone: "low", days: 20 });
  });

  it("goes deeper red under a week, with kind wording", () => {
    const s = lookaheadStatus("2026-11-02", today);
    expect(s.tone).toBe("urgent");
    expect(s.message).not.toMatch(/overdue|late|behind|failed/);
  });

  it("copes with a date in the past", () => {
    expect(lookaheadStatus("2026-10-20", today)).toMatchObject({ tone: "urgent", pct: 0 });
  });
});
