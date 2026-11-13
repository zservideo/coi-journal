// Warren Brown's AEO checklist (Get AI Authority, Nov 2026), adapted for COI Journal reports. build.js runs
// it on every gated report, released or queued, and refuses to build when anything misses, so a queued
// report can't fail on its release morning.
//
// A report is gated when it has a brief (content/reports/briefs/<slug>.json) or is dated on or after
// GATE_FROM. What carries over from forsured.ai: the brief (B1, B2), the answer paragraph (S1), question
// H2s (S2), a captioned table (S5), 5 to 8 FAQs that match FAQPage (S6), links (L1 to L3), JSON-LD rules
// (J5, J6), the copy rules (W1 to W6) and the not-advice line (W9). What doesn't: word targets and keyword
// counts (S4, S9), the Forsured paragraph (S7; the Journal is vendor neutral) and the ranking rules (R2).
// The named author (S8, J1) waits for a firmer editorial plan and the editor's approval of their name and
// title; until then the byline is "COI Journal News Staff".
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BRIEFS = path.join(ROOT, 'content', 'reports', 'briefs');
const SITE = 'https://coijournal.com';
const GATE_FROM = '2026-11-16';
// Report body H2s that keep their label instead of a question (S2).
const LABEL_H2 = /^(the short version|common questions|sources)$/i;
// Sister sites: not outside sources (L2), not Journal pages (L1).
const OWNED = /^https?:\/\/(www\.)?(forsured\.ai|forsured\.com|app\.forsured\.com|coidigest\.com)/i;

// Visible-copy rules (Section 8), the same list forsured.ai uses.
const WRITING = [
  [/—/, 'W1: no em dash'],
  [/\bcall to action\b|\bCTA\b|\bconversions?\b|\bfunnel\b|\bmessaging\b|positions? itself|\bvalue prop|\bICP\b|target audience|landing page|\bSERP\b|\bkeywords?\b|share of voice|\bimpressions\b|click-through|brand awareness|go-to-market|pain points?|use cases?|differentiators?|\bleverag(e|es|ed|ing)\b/i, 'W4: marketing vocabulary'],
  [/worth noting|worth stating|and that's the point|\bdeliberately\b/i, 'W5: meta-commentary'],
  [/\bcancell(ed|ing)\b|\blicence\b|\bcatalogue\b|\bbehaviour\b|\brecognis(e|ed|es|ing)\b|\borganis(e|ed|es|ing|ation)\b/i, 'W2: US spelling'],
  [/\bAI visibility\b|\bPeec\b|\bprompt (tracking|research)\b/i, 'W6: never mention AI visibility research'],
];

const words = (s) => (String(s).trim().match(/\S+/g) || []).length;
const plain = (md) => String(md).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`|>#]/g, ' ');

function readBrief(slug) {
  const file = path.join(BRIEFS, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`content/reports/briefs/${slug}.json is not valid JSON (${e.message})`);
  }
}

const gated = (r, brief) => Boolean(brief) || r.date.slice(0, 10) >= GATE_FROM;

// Copy rules on any text (reports and Worth Reading picks). Returns the misses.
function copyMisses(text) {
  const out = [];
  for (const [re, why] of WRITING) {
    const m = text.match(re);
    if (m) out.push(`${why}: "${m[0]}" in ...${text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, ' ')}...`);
  }
  return out;
}

// Returns the misses for one report. r.body is the raw Markdown (before queued links are unlinked).
function check(r, brief, html) {
  const fails = [];
  const miss = (rule, msg) => fails.push(`${rule}: ${msg}`);

  // B1, B2: the brief.
  if (!brief) {
    miss('B1', `no brief at content/reports/briefs/${r.slug}.json`);
    return fails;
  }
  const qs = brief.questions || [];
  if (qs.length < 1 || qs.length > 3) miss('B1', `brief needs 1 to 3 questions (has ${qs.length})`);
  const kws = (brief.target_keywords || []).map((k) => (typeof k === 'string' ? k : k.kw)).filter(Boolean);
  if (kws.length < 5 || kws.length > 10) miss('B1', `brief needs 5 to 10 target_keywords (has ${kws.length})`);
  const comp = brief.competing_sources || [];
  if (!comp.length || comp.some((c) => !c.url || !c.title)) miss('B2', 'brief needs competing_sources, each with url and title');

  // S1: a 40 to 60 word answer paragraph, first under the H1.
  const n = words(plain(r.answer || ''));
  if (n < 40 || n > 60) miss('S1', `"answer" is ${n} words, keep it 40 to 60`);

  // S2: question-shaped H2s.
  const h2s = [...r.body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  for (const h of h2s) if (!LABEL_H2.test(h) && !/\?$/.test(h)) miss('S2', `H2 "${h}" should be a question a reader would ask`);

  // S3: sections open on the noun, not "It" or "This".
  const blocks = r.body.split(/\n\s*\n/);
  blocks.forEach((b, i) => {
    if (/^## /.test(b) && blocks[i + 1] && /^(It|This|That|These|They)\b/.test(blocks[i + 1].trim())) miss('S3', `the section "${b.slice(3)}" opens with "${blocks[i + 1].trim().split(' ')[0]}"; name the subject`);
  });

  // S5: a table with a caption and header cells.
  const prose = (html.match(/<div class="prose">([\s\S]*?)\n {6}<\/div>/) || [, ''])[1];
  if (!/<table>\s*<caption>[\s\S]*?<th /.test(prose)) miss('S5', 'needs a table with a caption ("Table: <caption>" line above it) and header cells');

  // S6: 5 to 8 FAQs of 40 to 80 words; visible text matches FAQPage word for word.
  const faq = r.faq || [];
  if (faq.length < 5 || faq.length > 8) miss('S6', `needs 5 to 8 FAQs (has ${faq.length})`);
  for (const f of faq) {
    const w = words(plain(f.a));
    if (w < 40 || w > 80) miss('S6', `FAQ "${f.q}" answer is ${w} words, keep it 40 to 80`);
  }
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const graph = ld.flatMap((j) => JSON.parse(j)['@graph'] || []);
  const faqLd = graph.find((g) => g['@type'] === 'FAQPage');
  const visible = [...html.matchAll(/<details class="faq"><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, '')]);
  const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  const ldPairs = faqLd ? faqLd.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]) : [];
  if (faq.length && (ldPairs.length !== visible.length || ldPairs.some(([q, a], i) => q !== unesc(visible[i][0]) || a !== unesc(visible[i][1])))) miss('S6', 'FAQPage JSON-LD does not match the visible FAQ word for word');

  // L1, L2, L3: links in the body.
  const links = [...r.body.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map((m) => ({ text: m[1], href: m[2] }));
  const internal = links.filter((l) => /^\/(?!\/)/.test(l.href) || l.href.startsWith(SITE));
  const external = links.filter((l) => /^https?:\/\//.test(l.href) && !l.href.startsWith(SITE) && !OWNED.test(l.href));
  if (internal.length < 3 || internal.length > 8) miss('L1', `${internal.length} internal body links, needs 3 to 8`);
  if (external.length < 3 || external.length > 8) miss('L2', `${external.length} external body links, needs 3 to 8`);
  for (const l of links) if (/^(https?:\/\/|www\.)/i.test(l.text)) miss('L3', `link text "${l.text}" is a bare URL, use descriptive words`);
  const bare = r.body.replace(/\[[^\]]*\]\([^)]*\)/g, '');
  if (/\bhttps?:\/\/|\bwww\.\w/.test(bare)) miss('L3', 'visible URL in the body');
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(bare)) miss('L3', 'email address not in a mailto: link');

  // J5, J6.
  const rep = graph.find((g) => g['@type'] === 'Report') || {};
  if (rep.dateModified !== r.updated) miss('J5', 'dateModified must equal the updated date');
  if (r.updated !== r.date && !html.includes(`Updated <time datetime="${r.updated}"`)) miss('J5', 'visible "Updated" date missing from the byline');
  if (/<!--/.test(html)) miss('J6', 'HTML comment in the published page');
  if (ld.some((j) => /\n/.test(j.trim()))) miss('J6', 'JSON-LD must be minified');

  // W1 to W6 on the report's own copy; W9 on the page.
  const copy = [r.title, r.dek, r.answer || '', r.description, r.question || '', ...r.takeaways, plain(r.body), r.method, ...faq.flatMap((f) => [f.q, plain(f.a)])].join('\n');
  for (const m of copyMisses(copy)) miss(m.slice(0, 2), m);
  if (!/general information, not legal or insurance advice/i.test(html)) miss('W9', 'needs the "general information, not legal or insurance advice" line');

  return fails;
}

module.exports = { check, readBrief, gated, copyMisses, GATE_FROM };
