#!/usr/bin/env node
// Renders assets/og.png (1200x630 share card) and assets/logo.png (600x120 wordmark) with Playwright.
//   node tools/og.js
const path = require('path');
const { chromium } = require('playwright');
const FONTS = 'https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz,wght@8..144,400;8..144,600&family=Inter:wght@500;600&family=JetBrains+Mono:wght@500&display=swap';
const base = `<link rel="stylesheet" href="${FONTS}"><style>*{margin:0;box-sizing:border-box}body{background:#F7F4EE;color:#1F201C;font-family:Inter}.n{font-family:'Roboto Serif';font-variation-settings:'opsz' 144;font-weight:600;letter-spacing:-.025em}</style>`;
const og = `${base}<div style="width:1200px;height:630px;display:flex;flex-direction:column;justify-content:space-between;padding:56px 72px">
<div style="display:flex;justify-content:space-between;font:500 18px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#4A4843"><span>Contractor COIs · Endorsements · Project requirements</span><span>Est. 2026</span></div>
<div style="text-align:center"><div class="n" style="font-size:156px;line-height:1">COI Journal</div><div style="border-top:5px double #1F201C;border-bottom:1.5px solid #1F201C;height:9px;margin:26px 0 22px"></div>
<div style="font-family:'Roboto Serif';font-style:italic;font-size:34px;color:#4A4843">Construction insurance compliance, reported.</div></div>
<div style="display:flex;align-items:center;gap:12px;font:500 22px Inter;color:#4A4843">Published by <span style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:5px;background:#FB612A;color:#fff;font:700 19px Inter">F</span><span style="color:#1F201C;font-weight:600">Forsured</span></div></div>`;
const logo = `${base}<div style="width:600px;height:120px;display:flex;align-items:center;justify-content:center;background:#F7F4EE"><div class="n" style="font-size:76px;line-height:1">COI Journal</div></div>`;
(async () => {
  const b = await chromium.launch();
  for (const [html, w, h, out] of [[og, 1200, 630, 'og.png'], [logo, 600, 120, 'logo.png']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, '..', 'assets', out) });
    console.log('wrote assets/' + out);
  }
  await b.close();
})();
