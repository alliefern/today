// WCAG contrast checker for the palette. run: node scripts/contrast.mjs
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// mix like css color-mix(in srgb, c pct%, white)
const mix = (hex, pct) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * pct + 255 * (1 - pct)).toString(16).padStart(2, "0")).join("");

const T = { cream: "#FFF6F1", blush: "#FFE3EE", white: "#FFFFFF", ink: "#3A0F36", inkSoft: "#6B3562", berry: "#B8135F", berryDeep: "#8E0C49", plum: "#3A0F36", mint: "#D6F5E6", lilac: "#E6DCFF", butter: "#FFF0B8", pinkAlert: "#FFB8D2" };
const checks = [
  ["ink on cream", T.ink, T.cream, 4.5], ["ink-soft on cream", T.inkSoft, T.cream, 4.5], ["ink-soft on white", T.inkSoft, T.white, 4.5],
  ["ink-soft on blush", T.inkSoft, T.blush, 4.5], ["berry on cream (text)", T.berry, T.cream, 4.5], ["berry on white (text)", T.berry, T.white, 4.5],
  ["white on berry (buttons)", T.white, T.berry, 4.5], ["white on berry-deep", T.white, T.berryDeep, 4.5], ["white on plum", T.white, T.plum, 4.5],
  ["ink on mint", T.ink, T.mint, 4.5], ["ink on lilac", T.ink, T.lilac, 4.5], ["ink on butter", T.ink, T.butter, 4.5], ["ink on alert pink", T.ink, T.pinkAlert, 4.5],
  ["ink-soft on mint", T.inkSoft, T.mint, 4.5], ["ink-soft on lilac", T.inkSoft, T.lilac, 4.5], ["ink-soft on alert pink", T.inkSoft, T.pinkAlert, 4.5],
  ["focus ring plum vs cream (3:1)", T.plum, T.cream, 3], ["focus ring white vs plum (3:1)", T.white, T.plum, 3],
];
let bad = 0;
for (const [name, fg, bg, min] of checks) { const r = ratio(fg, bg); const ok = r >= min; if (!ok) bad++; console.log(`${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}  ${name}`); }
const projects = ["#FF6FA8","#C98B5B","#A78BFA","#FF8A5B","#3DC1D3","#5BD68A","#F5B82E","#7C9CFF","#F472D0","#E0457B","#34C3A0"];
for (const c of projects) { const bg = mix(c, 0.2); for (const [n, fg] of [["ink", T.ink], ["ink-soft", T.inkSoft]]) { const r = ratio(fg, bg); if (r < 4.5) { bad++; console.log(`FAIL  ${r.toFixed(2)}  ${n} on 20% ${c}`); } } }
console.log(bad ? `\n${bad} failing` : "\nall pass (incl. 11 project tints)");
process.exit(bad ? 1 : 0);
