// regenerates the png icons from public/icons/icon.svg.
// playwright isn't a dependency of the app; run this with a playwright install in scope:
//   node scripts/make-icons.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const svg = readFileSync(new URL("../public/icons/icon.svg", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(file, size, { rounded = false, inset = 0 } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const radius = rounded ? size * 0.22 : 0;
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}div{width:${size}px;height:${size}px;border-radius:${radius}px;overflow:hidden;background:#b8135f}
     svg{width:100%;height:100%;display:block;transform:scale(${1 - inset});transform-origin:center}</style><div>${svg}</div>`,
  );
  await page.screenshot({ path: new URL(`../public/icons/${file}`, import.meta.url).pathname, omitBackground: true });
}

await render("icon-192.png", 192, { rounded: true });
await render("icon-512.png", 512, { rounded: true });
await render("maskable-512.png", 512, { inset: 0.2 }); // content inside the maskable safe zone
await render("apple-touch-icon.png", 180); // ios rounds the corners itself
await browser.close();
