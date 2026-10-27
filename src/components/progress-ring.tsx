export function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 1 : done / total;
  const complete = pct >= 1;
  return (
    <div
      role="img"
      aria-label={total === 0 ? "nothing on the list" : `${done} of ${total} done`}
      className="relative size-24 shrink-0 text-white"
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-pink-bright)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.3,1.4,.5,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-heading text-xl font-extrabold" aria-hidden>
        {complete ? "✨" : `${done}/${total}`}
      </div>
    </div>
  );
}
