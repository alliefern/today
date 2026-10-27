"use client";

import { useEffect, useState } from "react";

const BITS = ["🌸", "✨", "💖", "🎀", "⭐", "🍒"];

function makePieces() {
  return Array.from({ length: 34 }, (_, i) => ({
    glyph: BITS[i % BITS.length],
    x: `${Math.round(Math.random() * 100)}%`,
    dx: `${Math.round((Math.random() - 0.5) * 160)}px`,
    rot: `${Math.round((Math.random() - 0.5) * 720)}deg`,
    s: `${18 + Math.round(Math.random() * 16)}px`,
    t: `${(2.2 + Math.random() * 1.6).toFixed(2)}s`,
    d: `${(Math.random() * 0.6).toFixed(2)}s`,
  }));
}

/** a short shower of sparkles. mount it to fire it; it removes itself. */
export function Confetti() {
  const [pieces] = useState(makePieces);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(id);
  }, []);
  if (!visible) return null;
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{ "--x": p.x, "--dx": p.dx, "--rot": p.rot, "--s": p.s, "--t": p.t, "--d": p.d } as React.CSSProperties}
        >
          {p.glyph}
        </i>
      ))}
    </div>
  );
}
