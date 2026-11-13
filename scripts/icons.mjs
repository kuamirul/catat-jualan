// Renders public/favicon.svg into the PNG icons the manifest needs.
// Uses Playwright's Chromium if available (not a project dependency); the PNGs are committed,
// so this only needs re-running when the icon design changes.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const b64 = Buffer.from(svg).toString('base64');

const out = [
  { file: 'icon-192.png', size: 192, pad: 0, bg: 'transparent' },
  { file: 'icon-512.png', size: 512, pad: 0, bg: 'transparent' },
  { file: 'apple-touch-icon.png', size: 180, pad: 0, bg: '#0f6b3a' },
  // maskable: keep artwork inside the 80% safe zone on a full-bleed background
  { file: 'icon-maskable-512.png', size: 512, pad: 0.12, bg: '#0f6b3a' },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const o of out) {
  const inner = Math.round(o.size * (1 - o.pad * 2));
  await page.setViewportSize({ width: o.size, height: o.size });
  await page.setContent(`<html><body style="margin:0;background:${o.bg};display:grid;place-items:center;height:${o.size}px">
    <img src="data:image/svg+xml;base64,${b64}" width="${inner}" height="${inner}"></body></html>`);
  await page.screenshot({ path: `public/${o.file}`, omitBackground: o.bg === 'transparent' });
  console.log('wrote public/' + o.file);
}
await browser.close();
