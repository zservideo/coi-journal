#!/usr/bin/env node
// Builds coijournal.com from content/ into static files GitHub Pages serves as-is:
//   index.html                    the front page
//   articles/<slug>/index.html    one page per article (NewsArticle JSON-LD), plus index.md for AI answer engines
//   <page>/index.html             about, principles, methodology, digest, gap-of-the-month
//   404.html, feed.xml, sitemap.xml, robots.txt, llms.txt, email/welcome.html
//
//   node tools/build.js           write everything
//   node tools/build.js --check   exit 1 if any generated file is out of date (the tests run this)
//
// Forked from forsured-site's tools/blog/build.js (same JSON front matter and Markdown subset), with
// COI Journal's own masthead and look. Rules for every page, enforced by tests/site.spec.js:
//   - "Published by Forsured" in the top strip and the footer
//   - the shared Google tag (GTM-P6PXX2JM) first in <head>
//   - Forsured's Terms of Service and Privacy Policy in the footer and under every form
//   - every call to action goes to the free COI risk check on forsured.ai with utm_source=coijournal
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://coijournal.com';
const FORSURED = 'https://forsured.ai';
const CHECK = process.argv.includes('--check');

// ---------- settings ----------

// Where readers write to. Swap for editors@coijournal.com once that mailbox forwards somewhere.
const CONTACT = 'hello@forsured.ai';
// Web3Forms emails the team on every signup (same key as forsured.ai).
const WEB3FORMS_KEY = '9f256d7f-4b10-4b26-8502-bf23abe8455d';
// Make webhook for "COI Journal: Digest signups" (Attio list coi_digest_subscribers + welcome email).
// Empty until the Make scenario exists; the forms then post to Web3Forms only.
// Scenario 7020965 in Make; posting here is harmless while the scenario is inactive.
const MAKE_WEBHOOK = 'https://hook.us2.make.com/98whleoxclod0c7xauzmuxxgqmxo5mpp';
const LAUNCH = 'Launching December 2026';
// The edition line. No. 0 is the pre-launch issue; No. 1 is the first issue of The COI Digest.
const EDITION = 'Vol. 1 · No. 0';
const { PEOPLE, TERMS, ROUNDS, THE_NUMBER } = require('./desk');
const person = (slug) => PEOPLE.find((p) => p.slug === slug) || null;
const term = (slug) => TERMS.find((t) => t.slug === slug);

const cta = (campaign) => `${FORSURED}/?utm_source=coijournal&utm_medium=referral&utm_campaign=${campaign}#demo`;
const fsLink = (p, campaign) => `${FORSURED}${p}?utm_source=coijournal&utm_medium=referral&utm_campaign=${campaign}`;

// COI 101 explainers that already live on forsured.ai. Reference content stays there (search authority);
// the Journal links to it rather than copying it. Titles match the live posts.
const LIBRARY = [
  ['/blog/compliance-isnt-coverage/', "A COI on file isn't proof of coverage"],
  ['/blog/how-to-check-a-contractor-coi/', 'How to check a contractor COI against your project requirements'],
  ['/blog/primary-and-noncontributory/', 'What does primary and noncontributory mean on a COI?'],
  ['/blog/waiver-of-subrogation-coi/', 'What does waiver of subrogation mean on a COI?'],
  ['/blog/notice-of-cancellation-coi/', "Will a COI tell you if a contractor's policy is cancelled?"],
  ['/blog/completed-operations-additional-insured/', 'Does additional insured status cover you after the job is done?'],
];

// [desk, what it publishes, where it lives today]
const SECTIONS = [
  ['Worth Reading', 'Our weekly column: the best construction insurance reporting from other outlets, summarized and linked.', '/worth-reading/'],
  ['The data desk', 'The COI Gap Index and The Number: how often contractor COIs fail, and what it costs.', '/methodology/'],
  ['The Dictionary', 'One term at a time, with the form numbers: additional insured, waiver of subrogation, per project aggregate.', '/dictionary/'],
  ['Spot the Gap', 'A specimen certificate and a set of project requirements. Find what fails before we tell you.', '/spot-the-gap/'],
  ['Plain Speak', 'Steve Massei, a GC owner, explains one insurance idea at a time in plain English, on video.', '/people/steve-massei/'],
];

const NUMBERS = [
  ['Gap rate', 'Share of contractor COIs that fail at least one project requirement, and the top reasons why.', 'Shared GC archives and free COI risk checks, anonymized'],
  ['Broker view', 'What construction brokers see breaking most often, and how long a fix takes.', 'A standing quarterly panel of construction brokers'],
  ['Owner rules', 'What public owners actually require from contractors, compared state by state.', 'Insurance sections of public bid documents'],
];

// A specimen certificate: sample data drawn in the Forsured product style, never a real contractor.
// Round 1 of Spot the Gap doubles as the front-page specimen.
function specimen(round = ROUNDS[0], { caption = true } = {}) {
  const fails = round.rows.filter((r) => r[3]).length;
  return `<figure class="spec">
  <div class="spec-doc">
    <div class="spec-top"><span>Certificate of liability insurance</span><span class="spec-tag">Specimen</span></div>
    <dl class="spec-meta"><div><dt>Insured</dt><dd>${esc(round.insured)}</dd></div><div><dt>Project</dt><dd>${esc(round.project)}</dd></div></dl>
    <div class="spec-scroll" tabindex="0" role="region" aria-label="Specimen certificate checked against project requirements"><table>
      <thead><tr><th scope="col">Coverage</th><th scope="col">Project requires</th><th scope="col">Certificate shows</th><th scope="col">Check</th></tr></thead>
      <tbody>${round.rows.map(([c, r, o, g]) => `<tr${g ? ' class="gap"' : ''}><th scope="row">${esc(c)}</th><td>${esc(r)}</td><td>${esc(o)}</td><td>${g ? '<span class="flag">Fails</span>' : '<span class="meets">Meets</span>'}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="spec-foot"><span class="spec-score">${fails} of ${round.rows.length} checks fail</span><span>The certificate says covered. The policy doesn't.</span></div>
  </div>
  ${caption ? '<figcaption>Specimen. Sample data, not a real contractor.</figcaption>' : ''}
</figure>`;
}

// Docket numbers: every published piece gets one, stamped like a filed document.
const stamp = (docket, date) => `<span class="stamp" aria-label="Docket ${esc(docket)}"><b>Docket</b>${esc(docket)}${date ? `<i>Filed ${human(date)}</i>` : ''}</span>`;

// Cyanotype monogram: our stand-in for headshots until we have photography.
const monogram = (p, size = 72) => `<svg class="mono" width="${size}" height="${size}" viewBox="0 0 72 72" role="img" aria-label="${esc(p.name)} monogram"><circle cx="36" cy="36" r="35" fill="#1F201C"/><circle cx="36" cy="36" r="29" fill="none" stroke="#D9A227" stroke-width="1" stroke-dasharray="2 3"/><path d="M8 52h56M12 58h48" stroke="#3A3B35" stroke-width=".8"/><text x="36" y="44" text-anchor="middle" font-family="Roboto Serif,Georgia,serif" font-weight="600" font-size="24" fill="#F4F0E8" letter-spacing="1">${esc(p.initials)}</text></svg>`;

// Original blueprint art: a certificate and the policy behind it, drawn on a cyanotype sheet with a
// title block, the way a set of construction drawings is. The orange dimension line is the gap.
function blueprint({ sheet, title, docket, date, motif = 'gap' }) {
  const grid = `<defs><pattern id="g-${sheet}" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#2C2D27" stroke-width=".6"/></pattern><pattern id="G-${sheet}" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M120 0H0V120" fill="none" stroke="#383932" stroke-width="1"/></pattern></defs><rect width="960" height="440" fill="#1F201C"/><rect width="960" height="440" fill="url(#g-${sheet})"/><rect width="960" height="440" fill="url(#G-${sheet})"/>`;
  const line = 'fill="none" stroke="#E9E4DA" stroke-width="1.6"';
  const thin = 'fill="none" stroke="#9A8C66" stroke-width="1"';
  const lab = (x, y, t, anchor = 'start', fill = '#E9E4DA') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="JetBrains Mono,ui-monospace,monospace" font-size="11" letter-spacing="1.5" fill="${fill}">${t}</text>`;
  const ruled = (x, y, w, n, gap = 18) => Array.from({ length: n }, (_, i) => `<path d="M${x} ${y + i * gap}h${w - (i % 3 === 2 ? 60 : 0)}" ${thin}/>`).join('');
  const drawings = {
    gap: `
    <rect x="70" y="70" width="250" height="310" ${line}/><path d="M70 104h250" ${line}/>${lab(84, 92, 'ACORD 25 · SPECIMEN')}${ruled(88, 132, 214, 7)}
    <rect x="88" y="270" width="16" height="16" ${line}/><path d="M91 273l10 10M101 273l-10 10" stroke="#FB612A" stroke-width="2"/>${lab(112, 283, 'ADDL INSD  Y')}
    <rect x="430" y="70" width="250" height="310" ${line} stroke-dasharray="6 5"/><path d="M430 104h250" ${line} stroke-dasharray="6 5"/>${lab(444, 92, 'POLICY + ENDORSEMENTS')}${ruled(448, 132, 214, 5)}
    <rect x="448" y="250" width="214" height="56" fill="none" stroke="#FB612A" stroke-width="1.6" stroke-dasharray="3 4"/>${lab(555, 283, 'NO ENDORSEMENT', 'middle', '#FFB08F')}
    <path d="M320 278H430" stroke="#FB612A" stroke-width="2"/><path d="M320 270v16M430 270v16" stroke="#FB612A" stroke-width="2"/>${lab(375, 262, 'THE GAP', 'middle', '#FFB08F')}
    ${lab(195, 404, 'WHAT IT SAYS', 'middle')}${lab(555, 404, 'WHAT IT COVERS', 'middle')}`,
    stack: `
    ${[0, 1, 2, 3].map((i) => `<rect x="${90 + i * 26}" y="${60 + i * 22}" width="230" height="290" fill="#1F201C" ${line}/>`).join('')}${ruled(184, 200, 180, 6)}
    ${lab(206, 182, 'COI · TRADE 04')}<path d="M440 120h220M440 160h220M440 200h220M440 240h220" ${thin}/>
    ${['GL', 'AI', 'UMB', 'WC'].map((t, i) => `${lab(440, 112 + i * 40, t)}<circle cx="${i === 1 || i === 3 ? 652 : 652}" cy="${108 + i * 40}" r="5" fill="${i === 1 || i === 3 ? '#FB612A' : '#9A8C66'}"/>`).join('')}
    <path d="M440 300h220" stroke="#FB612A" stroke-width="2"/><path d="M440 292v16M660 292v16" stroke="#FB612A" stroke-width="2"/>${lab(550, 330, '2 OF 4 FAIL', 'middle', '#FFB08F')}`,
  };
  return `<figure class="bp">
  <svg viewBox="0 0 960 440" role="img" aria-label="Blueprint-style drawing: ${esc(title)}">${grid}
    <rect x="12" y="12" width="936" height="416" fill="none" stroke="#9A8C66" stroke-width="1"/>${drawings[motif]}
    <g transform="translate(696 296)"><rect width="240" height="120" fill="#1F201C" stroke="#E9E4DA" stroke-width="1.2"/><path d="M0 34h240M0 64h240M0 92h240M110 92v28" stroke="#9A8C66"/>
      <text x="12" y="23" font-family="Roboto Serif,Georgia,serif" font-weight="600" font-size="17" fill="#D9A227">COI Journal</text>
      ${lab(12, 54, 'DATA DESK · ' + EDITION.toUpperCase().replace('·', '/'))}${lab(12, 83, 'DOCKET ' + docket)}${lab(12, 111, 'SHEET ' + sheet)}${lab(122, 111, date ? human(date).toUpperCase().replace(',', '').replace(/^(\w{3})\w*/, '$1') : '')}</g>
  </svg>
</figure>`;
}

// The Number: one sourced figure, its arithmetic and our markup of it.
function theNumber() {
  const n = THE_NUMBER;
  return `<section class="panel number" aria-labelledby="num-h">
  <span class="eyebrow">The Number · Data desk</span>
  <div class="num-grid">
    <div>
      <p class="big" id="num-h">${esc(n.figure)} <small>${esc(n.unit)}</small></p>
      <p class="what">${esc(n.what)}</p>
      <div class="math" aria-label="How the number is built">${n.math.map(([v, l]) => `<span class="chipbox"><b>${esc(v)}</b>${esc(l)}</span>`).join('<i aria-hidden="true">→</i>')}</div>
    </div>
    <aside class="markup"><span class="k">The markup</span><p>${esc(n.markup)}</p><p class="src">Source: <a href="${esc(n.source.url)}">${esc(n.source.title)}</a>, ${esc(n.source.publisher)}, ${esc(n.source.date)}.</p></aside>
  </div>
</section>`;
}

// The deck's gap line: orange segments with small labels, read left to right.
const gapline = (labels) => `<div class="gapline" aria-hidden="true">${labels.map((l) => `<span><i></i><b>${l}</b></span>`).join('')}</div>`;

// ---------- reading content ----------

function readDir(dir, required) {
  const src = path.join(ROOT, 'content', dir);
  return fs
    .readdirSync(src)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(src, f), 'utf8');
      const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!m) throw new Error(`${dir}/${f}: missing the --- JSON front matter block`);
      let meta;
      try {
        meta = JSON.parse(m[1]);
      } catch (e) {
        throw new Error(`${dir}/${f}: front matter is not valid JSON (${e.message})`);
      }
      for (const k of required) if (meta[k] === undefined) throw new Error(`${dir}/${f}: front matter needs "${k}"`);
      if (meta.description.length < 70 || meta.description.length > 170) throw new Error(`${dir}/${f}: description is ${meta.description.length} characters, keep it 70 to 170`);
      const slug = f.replace(/\.md$/, '');
      return { ...meta, slug, body: m[2].trim().replace(/\{\{CONTACT\}\}/g, CONTACT) };
    })
    .filter((p) => !p.draft);
}

const articles = () =>
  readDir('articles', ['title', 'description', 'dek', 'date', 'section', 'byline', 'docket', 'takeaways', 'sources'])
    .map((a) => ({ ...a, url: `/articles/${a.slug}/`, updated: a.updated || a.date }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
const pages = () => readDir('pages', ['title', 'description', 'dek', 'url']);
// Worth Reading: curated picks from other outlets. Each one is a short summary in our words, one line of
// commentary and a link to the full story. Never republished, never sponsored, never a vendor blog.
const picks = () => {
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'worth-reading.json'), 'utf8'));
  for (const k of list) {
    for (const f of ['title', 'url', 'publisher', 'date', 'summary', 'why', 'picked']) if (!k[f]) throw new Error(`worth-reading.json: "${k.title || '?'}" needs "${f}"`);
    const words = k.summary.split(/\s+/).length;
    if (words > 60) throw new Error(`worth-reading.json: "${k.title}" summary is ${words} words, keep it to 60`);
    if (/\/spons\//.test(k.url)) throw new Error(`worth-reading.json: "${k.title}" is sponsored content`);
  }
  return list.sort((a, b) => (a.picked < b.picked ? 1 : a.picked > b.picked ? -1 : a.date < b.date ? 1 : -1));
};

// ---------- a small Markdown subset (same as forsured.ai's blog) ----------
// Blocks: ## and ### headings, paragraphs, - and 1. lists, > quotes. Inline: **bold**, *italic*, [text](url), `code`.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = (md) => md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '');

function markdown(md) {
  const out = [];
  for (const block of md.split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    let h;
    if ((h = lines[0].match(/^(#{2,3}) (.+)$/))) out.push(`<h${h[1].length} id="${slugify(h[2])}">${inline(h[2])}</h${h[1].length}>`);
    else if (lines.every((l) => /^- /.test(l))) out.push('<ul>' + lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('') + '</ul>');
    else if (lines.every((l) => /^\d+\. /.test(l))) out.push('<ol>' + lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('') + '</ol>');
    else if (lines.every((l) => /^>/.test(l))) out.push(`<blockquote><p>${inline(lines.map((l) => l.replace(/^> ?/, '')).join(' '))}</p></blockquote>`);
    else out.push(`<p>${inline(lines.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ---------- dates ----------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const human = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const year = (iso) => iso.slice(0, 4);

// ---------- shared page parts ----------

const GTAG = `<!-- Google tag (GTM-P6PXX2JM), shared with forsured.ai. Keep it first in <head>, once per page. -->
<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-P6PXX2JM"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
</script>
`;
const FONTS = 'https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz,wght@8..144,400;8..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap';
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%231F201C'/%3E%3Ctext x='16' y='23' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='19' fill='%23F7F4EE'%3EJ%3C/text%3E%3Crect x='6' y='26' width='20' height='2' fill='%23D9A227'/%3E%3C/svg%3E";

const FORSURED_ORG = { '@type': 'Organization', '@id': `${FORSURED}/#organization`, name: 'Forsured', url: FORSURED };
const PUBLISHER = {
  '@type': 'NewsMediaOrganization',
  '@id': `${SITE}/#publication`,
  name: 'COI Journal',
  url: `${SITE}/`,
  logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo.png`, width: 600, height: 120 },
  description: 'A publication about construction insurance compliance: contractor certificates of insurance, endorsements and project requirements. Published by Forsured.',
  parentOrganization: FORSURED_ORG,
  publishingPrinciples: `${SITE}/principles/`,
  ethicsPolicy: `${SITE}/principles/`,
  correctionsPolicy: `${SITE}/principles/#corrections`,
  ownershipFundingInfo: `${SITE}/about/#who-publishes-it`,
  actionableFeedbackPolicy: `${SITE}/principles/#corrections`,
  email: CONTACT,
};
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'COI Journal', url: `${SITE}/`, publisher: { '@id': PUBLISHER['@id'] }, inLanguage: 'en-US' };

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#F7F4EE;--card:#FFFDF9;--ink:#1F201C;--ink2:#4A4843;--mute:#67635B;--rule:#D9D3C7;--rule2:#BDB5A6;--f:#FB612A;--fdk:#B4461A;--cy:#1F201C;--cy2:#7E5B0C;--cylt:#E9E4DA;--cymid:#8C7A4F;--o:#D9A227;--odk:#C48F1C;--otint:#F6EBCB;--serif:'Roboto Serif',Georgia,'Times New Roman',serif;--sans:'Inter',Arial,sans-serif;--mono:'JetBrains Mono',ui-monospace,Menlo,monospace}
html{scroll-behavior:smooth}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible,summary:focus-visible{outline:3px solid var(--ink);outline-offset:2px;border-radius:2px}
.strip :focus-visible,.band :focus-visible,.panel :focus-visible,.house :focus-visible,.defbox :focus-visible{outline-color:var(--o)}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}}
[id]{scroll-margin-top:16px}
p,li{text-wrap:pretty}
.skip{position:absolute;left:-9999px}.skip:focus{left:16px;top:8px;z-index:10;background:var(--card);padding:8px 12px}
.wrap{max-width:1160px;margin:0 auto;padding:0 32px}
.col{max-width:700px;margin:0 auto}
.eyebrow{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--cy2)}
/* Top strip: the ownership line, on every page */
.strip{background:#151612;color:#E9E4DA;font-size:12.5px}
.strip .wrap{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:36px}
.strip a{text-decoration:none;color:#fff}
.strip a:hover{text-decoration:underline}
.pub{display:inline-flex;align-items:center;gap:8px}
.fmark{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:3px;background:var(--f);color:#fff;font:700 11px/1 var(--sans)}
/* Masthead: the cyanotype band, the one color that is COI Journal's alone */
.band{background-color:var(--cy);background-image:linear-gradient(#2C2D27 1px,transparent 1px),linear-gradient(90deg,#2C2D27 1px,transparent 1px);background-size:24px 24px;color:var(--cylt);border-bottom:4px solid var(--o)}
.mast{padding:30px 0 0;text-align:center}
.mast .name{display:inline-block;font-family:var(--serif);font-variation-settings:'opsz' 144;font-weight:600;font-size:clamp(46px,8.4vw,92px);line-height:1;letter-spacing:-.025em;text-decoration:none;color:#F4F0E8}
.mast .name span{color:var(--o)}
.mast .tag{font-family:var(--serif);font-style:italic;font-size:16px;color:#C9C3B8;margin-top:10px}
.mast.small{padding:16px 0 0}
.mast.small .name{font-size:clamp(34px,5vw,48px)}
.mast.small .tag{display:none}
.dateline{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:20px;padding:8px 0;border-top:1px solid var(--cymid);font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--o)}
.dateline b{font-weight:500;color:var(--o)}
.secnav{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 28px;padding:10px 0;border-bottom:1px solid var(--rule)}
.secnav a{display:inline-block;font-size:14.5px;font-weight:500;text-decoration:none;color:var(--ink2);line-height:40px;white-space:nowrap}
.secnav a:hover,.secnav a[aria-current]{color:var(--ink);text-decoration:underline;text-decoration-color:var(--cy2);text-underline-offset:5px}
/* Docket stamp, blueprint art, monograms */
.stamp{display:inline-flex;flex-direction:column;gap:1px;padding:5px 10px 4px;border:2px solid var(--cy2);border-radius:3px;color:var(--cy2);font-family:var(--mono);font-size:12px;font-weight:500;letter-spacing:.06em;transform:rotate(-1.5deg);background:var(--otint)}
.stamp b{font-size:11.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase}
.stamp i{font-style:normal;font-size:12px;letter-spacing:.04em}
.kick{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.bp{margin-top:24px}
.bp svg{display:block;width:100%;height:auto;border-radius:4px}
.mono{flex:none;display:block}
.byl{display:flex;align-items:center;gap:10px;margin-top:16px;font-size:13.5px;color:var(--mute)}
.byl a{color:var(--ink);font-weight:600;text-decoration:none}
.byl a:hover{text-decoration:underline;text-decoration-color:var(--cy2)}
.formno{display:inline-block;font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.03em;padding:1px 7px;border:1px solid var(--cy2);border-radius:3px;color:var(--cy2);white-space:nowrap}
/* Front page */
.front{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:0;margin-top:32px}
.front>*+*{border-left:1px solid var(--rule);padding-left:32px}
.front>:first-child{padding-right:32px}
.lead h2{font-family:var(--serif);font-variation-settings:'opsz' 72;font-weight:400;font-size:clamp(32px,4.2vw,50px);line-height:1.08;letter-spacing:-.02em;margin-top:10px;text-wrap:balance}
.lead h2 a{text-decoration:none}
.lead h2 a:hover{text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:var(--cy2);text-underline-offset:6px}
.lead .dek{font-family:var(--serif);font-size:20px;line-height:1.5;color:var(--ink2);margin-top:14px;max-width:620px}
.by{font-size:13px;color:var(--mute);margin-top:14px}
.lead ul{margin-top:22px;padding-top:18px;border-top:1px solid var(--rule);list-style:none}
.lead li{position:relative;padding-left:18px;font-size:15.5px;line-height:1.55;margin-top:10px;color:var(--ink2)}
.lead li::before{content:'';position:absolute;left:0;top:.62em;width:8px;height:2px;background:var(--o)}
.more{display:inline-block;margin-top:20px;font-weight:600;font-size:15px;text-decoration:underline;text-decoration-color:var(--cy2);text-underline-offset:4px}
.block{margin-top:56px;padding-top:14px;border-top:2px solid var(--ink)}
.block>.eyebrow{display:block}
.block>h2{font-family:var(--serif);font-weight:400;font-size:30px;line-height:1.2;letter-spacing:-.015em;margin-top:6px}
.block>p{color:var(--ink2);margin-top:8px;max-width:68ch}
.panel{margin-top:56px;background:var(--ink);color:#E9E4DA;border-radius:4px;padding:36px 36px 28px}
.panel .eyebrow{color:#D9A227}
.panel h2{font-family:var(--serif);font-weight:400;font-size:clamp(26px,3vw,36px);line-height:1.15;letter-spacing:-.015em;color:#fff;margin-top:8px;max-width:22ch}
.panel>p{font-size:15px;color:#C9C3B8;margin-top:10px;max-width:62ch}
.panel>p a{color:#fff;text-decoration-color:var(--cy2)}
.nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:26px}
.num{display:flex;flex-direction:column;gap:8px;padding:18px 20px;background:#2A2B26;border:1px solid #3A3B35;border-left:3px solid var(--o);border-radius:4px}
.num .k{font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#D9A227}
.num h3{font-family:var(--serif);font-weight:600;font-size:24px;line-height:1.15;color:#fff}
.num p{font-size:14.5px;color:#D6D0C5}
.num .src{margin-top:auto;padding-top:10px;border-top:1px solid #3A3B35;font-size:13px;color:#B5AFA4}
.num .src b{display:block;font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#ADA79C;margin-bottom:2px}
.chip{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;padding:3px 9px;border:1px solid #4A4B45;border-radius:4px;font-family:var(--mono);font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#E9E4DA}
.chip::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--o)}
.gapline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:28px}
.gapline span{display:flex;flex-direction:column;align-items:center;gap:8px}
.gapline i{display:block;width:100%;height:2px;background:var(--f)}
.gapline b{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#B5AFA4}
.gapline.light b{color:var(--mute)}
/* Specimen certificate: drawn like a COI on file, flagged the way the Forsured product flags it */
.spec{margin-top:24px}
.spec-doc{background:#fff;border:1px solid var(--rule2);border-radius:4px;padding:18px 20px 16px;color:var(--ink)}
.spec-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:10px;border-bottom:2px solid var(--ink);font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase}
.spec-tag{padding:2px 8px;border:1px solid var(--f);color:var(--fdk);border-radius:3px;transform:rotate(-2deg)}
.spec-meta{display:flex;flex-wrap:wrap;gap:6px 28px;margin-top:10px;font-size:13px}
.spec-meta dt{display:inline;color:var(--mute);margin-right:6px}
.spec-meta dd{display:inline;font-weight:500}
.spec-scroll{overflow-x:auto;margin-top:12px}
.spec table{width:100%;border-collapse:collapse;font-size:13.5px;line-height:1.4;min-width:520px}
.spec th,.spec td{text-align:left;padding:8px 10px 8px 0;border-bottom:1px solid var(--rule);vertical-align:top}
.spec thead th{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.spec tbody th{font-weight:600}
.spec tr.gap td:nth-child(3){color:var(--fdk)}
.flag{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--fdk);white-space:nowrap}
.flag::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--f);flex:none}
.meets{display:inline-flex;align-items:center;gap:6px;color:#2D7A4C;font-weight:600}
.meets::before{content:'';width:7px;height:7px;border-radius:50%;background:#2D7A4C}
.spec-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin-top:14px;font-family:var(--serif);font-style:italic;font-size:15px;color:var(--ink2)}
.spec-score{font-family:var(--mono);font-style:normal;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;background:var(--fdk);color:#fff;border-radius:3px}
.spec figcaption{font-size:12.5px;color:var(--mute);margin-top:8px}
.sec{border-top:2px solid var(--o)}
.secs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0 16px;margin-top:22px}
.sec{padding:14px 0 4px}
.sec h3{font-family:var(--serif);font-weight:600;font-size:18px;line-height:1.25}
.sec h3 a{text-decoration:none}.sec h3 a:hover{text-decoration:underline;text-decoration-color:var(--cy2)}
.sec p{font-size:14px;color:var(--ink2);margin-top:8px}
.lib{columns:2;column-gap:48px;margin-top:18px;list-style:none}
.lib li{break-inside:avoid;padding:12px 0;border-bottom:1px solid var(--rule)}
.lib a{font-family:var(--serif);font-size:18px;line-height:1.35;text-decoration:none}
.lib a:hover{text-decoration:underline;text-decoration-color:var(--cy2);text-underline-offset:4px}
.lib span{display:block;font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-top:4px}
/* The Number */
.number .num-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:32px;margin-top:10px;align-items:start}
.big{font-family:var(--serif);font-variation-settings:'opsz' 144;font-weight:600;font-size:clamp(64px,10vw,116px);line-height:1;letter-spacing:-.03em;color:var(--o)}
.big small{font-size:.28em;font-weight:400;letter-spacing:0;color:#E9E4DA}
.what{font-family:var(--serif);font-size:19px;line-height:1.45;color:#fff;margin-top:12px;max-width:40ch}
.math{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:20px}
.math i{font-style:normal;color:var(--o)}
.chipbox{display:inline-flex;flex-direction:column;padding:6px 11px;border:1px solid #4A4B45;border-radius:4px;background:#2A2B26;font-size:12px;color:#C9C3B8}
.math{font-variant-numeric:tabular-nums}
.chipbox b{font-family:var(--mono);font-size:15px;font-weight:500;color:#fff}
.markup{padding:18px 20px;background:#2A2B26;border:1px solid #3A3B35;border-left:3px solid var(--o);border-radius:4px}
.markup .k{font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#D9A227}
.markup p{font-size:14.5px;color:#D6D0C5;margin-top:8px}
.markup .src{font-size:13px;color:#B5AFA4;border-top:1px solid #3A3B35;padding-top:10px}
.markup a{color:#fff;text-decoration-color:var(--cy2)}
/* Two-up modules */
.duo{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:40px;align-items:start}
.duo h3{font-family:var(--serif);font-weight:400;font-size:28px;line-height:1.2;margin-top:6px}
.duo p{color:var(--ink2);margin-top:10px}
.duo .btn{margin-top:18px}
/* Dictionary */
.terms{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-top:20px;list-style:none}
.terms li{display:flex}
.terms a{display:flex;flex-direction:column;gap:8px;width:100%;padding:16px 18px;background:var(--card);border:1px solid var(--rule);border-top:3px solid var(--cy2);border-radius:4px;text-decoration:none}
.terms a:hover{border-color:var(--cy2)}
.terms strong{font-family:var(--serif);font-weight:600;font-size:18px;line-height:1.25}
.terms span.d{font-size:14px;color:var(--ink2)}
.terms .fs{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}
.defbox{margin-top:24px;padding:20px 22px;background:var(--cy);color:#D9A227;border-radius:4px;border-left:4px solid var(--o)}
.defbox .k{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--o)}
.defbox{color:#F4F0E8}.defbox p{font-family:var(--serif);font-size:20px;line-height:1.5;margin-top:6px}
.defbox .formno{color:var(--o);border-color:var(--cymid);margin:12px 6px 0 0}
.trio{display:grid;gap:14px;margin-top:24px}
.trio section{padding:16px 18px;border:1px solid var(--rule);border-left:3px solid var(--o);background:var(--card);border-radius:4px}
.trio h2{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--cy2)}
.trio p{font-family:var(--serif);font-size:18px;line-height:1.6;margin-top:6px}
.rel{margin-top:24px;font-size:15px}
.rel a{font-weight:600;text-decoration-color:var(--cy2)}
/* People */
.people{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:24px}
.card{display:flex;gap:16px;padding:18px;background:var(--card);border:1px solid var(--rule);border-radius:4px}
.card h2,.card h3{font-family:var(--serif);font-weight:600;font-size:20px;line-height:1.2}
.card h2 a,.card h3 a{text-decoration:none}
.card h2 a:hover,.card h3 a:hover{text-decoration:underline;text-decoration-color:var(--cy2)}
.card .role{font-family:var(--mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--cy2);margin-top:4px}
.card p{font-size:14px;color:var(--ink2);margin-top:6px}
.who{display:flex;gap:20px;align-items:center;margin-top:20px}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;list-style:none}
.tags li{font-size:13px;padding:4px 10px;border:1px solid var(--rule2);border-radius:20px;color:var(--ink2)}
/* Spot the Gap */
.round{margin-top:40px}
.round h2{font-family:var(--serif);font-weight:600;font-size:24px}
.round .spec-doc{margin-top:12px}
.pick{min-height:44px;padding:0 12px;border:1px solid var(--rule2);border-radius:6px;background:var(--card);font:inherit;font-size:13px;font-weight:600;color:var(--ink2);cursor:pointer;white-space:nowrap}
.pick[aria-pressed=true]{background:var(--fdk);border-color:var(--fdk);color:#fff}
.round .spec tr.hit td:nth-child(3),.round .spec tr.miss td:nth-child(3){color:var(--fdk)}
.result{margin-top:12px;font-size:15px;font-weight:600}
.answers{margin-top:12px;padding:14px 16px;border:1px solid var(--rule);border-left:3px solid var(--o);background:var(--card);border-radius:4px}
.answers summary{cursor:pointer;font-weight:600}
.answers ol{margin-top:10px;padding-left:20px;font-size:15px}
.answers li+li{margin-top:8px}
.answers a{font-weight:600;text-decoration-color:var(--cy2)}
.tease .spec table{min-width:0}
.ipart{margin-top:36px;padding-top:12px;border-top:2px solid var(--ink)}
.lead-in{font-family:var(--serif);font-size:19px;line-height:1.6;margin-top:10px}
.briefs{list-style:none;margin-top:6px}
.briefs li{padding:12px 0;border-bottom:1px solid var(--rule);font-family:var(--serif);font-size:18px;line-height:1.4}
.briefs a{text-decoration:none}.briefs a:hover{text-decoration:underline;text-decoration-color:var(--cy2)}
.briefs span{display:block;font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-top:4px}
.pick-card{margin-top:18px;padding:18px 20px;background:var(--card);border:1px solid var(--rule);border-left:3px solid var(--cy2);border-radius:4px}
.pick-card h3{font-family:var(--serif);font-weight:600;font-size:21px;line-height:1.3;margin-top:6px}
.pick-card h3 a{text-decoration:none}.pick-card h3 a:hover{text-decoration:underline;text-decoration-color:var(--cy2)}
.pick-card p{font-size:15.5px;color:var(--ink2);margin-top:8px}
.pick-card .src-line{font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)!important;margin-top:0!important}
.outlet{color:var(--cy2);font-weight:500}
.why{padding-top:8px;border-top:1px dashed var(--rule2)}
.why b{display:block;font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--cy2);margin-bottom:2px}
.out{display:inline-block;margin-top:10px;font-size:14px;font-weight:600;text-decoration-color:var(--cy2)}
.week{margin-top:32px}
.feature{border-top:4px solid var(--o)}
.feat-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap}
.feat-head h2{font-family:var(--serif);font-variation-settings:'opsz' 72;font-weight:600;font-size:clamp(34px,4.4vw,48px);line-height:1.05;letter-spacing:-.02em;margin-top:6px}
.feat-head p{color:var(--ink2);margin-top:8px;max-width:62ch}
.picks3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.picks3 .pick-card{margin-top:18px}
@media(max-width:860px){.picks3{grid-template-columns:1fr}}
/* Video */
.video{position:relative;margin-top:24px;aspect-ratio:9/16;max-width:360px;background:var(--cy);border-radius:4px;overflow:hidden}
.video button{position:absolute;inset:0;border:0;background:transparent;color:#fff;font:600 16px var(--sans);cursor:pointer}
.video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
/* Signup and forms */
.sub h2{font-family:var(--serif);font-weight:600;font-size:26px;line-height:1.15;margin-top:8px}
.sub>p{font-size:15px;color:var(--ink2);margin-top:8px}
.sub form,.gap form{display:grid;gap:10px;margin-top:16px}
label{font-size:13px;font-weight:500;color:var(--ink2)}
input[type=email],input[type=text],select,textarea{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--rule2);border-radius:6px;background:var(--card);font:inherit;font-size:15px;color:var(--ink)}
textarea{min-height:140px;resize:vertical}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border:1px solid var(--o);border-radius:6px;background:var(--o);color:var(--ink);font:inherit;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer}
.btn:hover{background:var(--odk);border-color:var(--odk)}
.btn.o{background:transparent;color:var(--ink);border-color:var(--ink)}
.btn.o:hover{background:var(--card)}
.btn.f{background:var(--o);border-color:var(--o);color:var(--ink)}
.btn.f:hover{background:var(--odk);border-color:var(--odk)}
.hp{display:none}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.fine{font-size:12.5px;line-height:1.5;color:var(--mute)}
.fine a{color:var(--ink2)}
.err{font-size:13px;color:#B03A2E}
.ok{font-size:15px;padding:12px 14px;border-left:3px solid #2D7A4C;background:var(--card);color:#2D7A4C}
[hidden]{display:none!important}
.check{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;font-weight:400;color:var(--ink2)}
.check input{margin-top:4px;width:16px;height:16px;flex:none;accent-color:var(--ink)}
.side .sub{padding-bottom:24px;border-bottom:1px solid var(--rule)}
.side .clip{margin-top:22px}
.side .clip h3{font-family:var(--serif);font-weight:600;font-size:19px;line-height:1.3;margin-top:8px}
.side .clip p{font-size:14.5px;color:var(--ink2);margin-top:6px}
.side .clip a{font-size:14px;font-weight:600}
/* Publisher's band: the one place the Journal sells, labeled as Forsured */
.house{margin-top:64px;background:var(--ink);color:#E9E4DA;border-top:3px solid var(--o)}
.house .wrap{display:grid;grid-template-columns:1.4fr 1fr;gap:32px;align-items:center;padding-top:40px;padding-bottom:40px}
.house .eyebrow{color:#D9A227}
.house h2{font-family:var(--serif);font-weight:400;font-size:clamp(24px,2.8vw,32px);line-height:1.2;color:#fff;margin-top:8px}
.house p{font-size:15px;margin-top:10px;max-width:58ch}
.house .btns{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end}
.panel-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.panel .panel-cta .btn{color:var(--ink);text-decoration:none}
.panel .panel-cta .btn.o{color:#fff}
.panel .btn.o{color:#fff;border-color:rgba(255,255,255,.4)}
.panel .btn.o:hover{background:rgba(255,255,255,.08)}
.house .btn.o{color:#fff;border-color:rgba(255,255,255,.4)}
.house .btn.o:hover{background:rgba(255,255,255,.08)}
/* Article and page */
.art{padding:44px 0 8px}
.art h1{font-family:var(--serif);font-variation-settings:'opsz' 72;font-weight:400;font-size:clamp(34px,5vw,54px);line-height:1.08;letter-spacing:-.02em;margin-top:10px;text-wrap:balance}
.art .dek{font-family:var(--serif);font-size:20px;line-height:1.5;color:var(--ink2);margin-top:14px}
.art .by{padding-bottom:18px;border-bottom:1px solid var(--rule)}
.tldr{margin-top:28px;padding:18px 20px;background:var(--card);border:1px solid var(--rule);border-left:3px solid var(--o)}
.tldr h2{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--cy2)}
.tldr ul{margin-top:8px;padding-left:18px}
.tldr li{font-size:15.5px;margin-top:6px}
.prose{font-family:var(--serif);font-size:19px;line-height:1.7;margin-top:28px}
.prose>*+*{margin-top:20px}
.prose h2{font-family:var(--serif);font-weight:600;font-size:26px;line-height:1.25;margin-top:40px}
.prose h3{font-family:var(--sans);font-size:17px;font-weight:600;margin-top:28px}
.prose ul,.prose ol{padding-left:24px}
.prose li+li{margin-top:8px}
.prose a{text-decoration:underline;text-decoration-color:var(--cy2);text-decoration-thickness:1px;text-underline-offset:3px}
.prose a:hover{text-decoration-thickness:2px}
.prose strong{font-weight:600}
.prose blockquote{border-left:3px solid var(--rule2);padding-left:18px;color:var(--ink2)}
.sources{margin-top:40px;padding-top:12px;border-top:1px solid var(--rule)}
.sources h2{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.sources ol{padding-left:20px;margin-top:8px;font-size:14px;color:var(--ink2)}
.sources li+li{margin-top:6px}
.disclose{margin-top:36px;padding:14px 16px;border:1px solid var(--rule);background:var(--card);font-size:14px;color:var(--ink2)}
.boxed{margin-top:36px;padding:22px 24px;background:var(--card);border:1px solid var(--rule)}
/* Footer */
footer{margin-top:64px;border-top:3px double var(--ink);padding:32px 0 28px}
.house+footer{margin-top:0;border-top:0}
.fgrid{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:40px}
.fname{font-family:var(--serif);font-variation-settings:'opsz' 144;font-weight:600;font-size:28px;letter-spacing:-.02em;text-decoration:none}
.fgrid p{font-size:13px;color:var(--mute);margin-top:8px;max-width:340px}
.fgrid h2{font-family:var(--mono);font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin-bottom:8px}
.fgrid nav a{display:block;font-size:14.5px;line-height:36px;text-decoration:none;color:var(--ink2)}
.fgrid nav a:hover{color:var(--ink);text-decoration:underline}
.fbot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:28px;padding-top:14px;border-top:1px solid var(--rule);font-size:12px;color:var(--mute)}
.fbot a{color:var(--ink2)}
.fbot p{max-width:760px}
@media(max-width:980px){.secs{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 16px}}
@media(max-width:860px){
  .wrap{padding:0 16px}
  .front{grid-template-columns:minmax(0,1fr)}
  .front>:first-child{padding-right:0}
  .front>*+*{border-left:0;padding-left:0;margin-top:36px;padding-top:20px;border-top:2px solid var(--ink)}
  .nums,.gapline,.number .num-grid,.duo{grid-template-columns:minmax(0,1fr)}
  .duo{gap:24px}
  .kick{flex-direction:column}
  .gapline{gap:12px}
  .panel{padding:26px 18px 22px;margin-left:-16px;margin-right:-16px;border-radius:0}
  .lib{columns:1}
  .house .wrap{grid-template-columns:1fr}
  .house .btns{justify-content:flex-start}
  .fgrid{grid-template-columns:1fr;gap:24px}
  .strip .tuesday{display:none}
  .dateline span:nth-child(2){display:none}
  .secnav{flex-wrap:nowrap;justify-content:flex-start;gap:0 20px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;mask-image:linear-gradient(90deg,#000 88%,transparent)}
  .secnav::-webkit-scrollbar{display:none}
  .prose{font-size:18px}
}
@media(max-width:520px){.secs{grid-template-columns:1fr}}
@media print{.strip,.secnav,.house,footer,.sub,form{display:none}}

.panel a,.markup a,.house a,.strip a{text-decoration-color:var(--o)}
.prose a,.rel a,.out,.more,.answers a,.byl a:hover{text-decoration-thickness:1.5px}
.mast h1{font:inherit;margin:0}
.err:not([hidden])+.fine{margin-top:0}
input[aria-invalid=true]{border-color:#B03A2E;box-shadow:0 0 0 1px #B03A2E}
`.trim();

function head({ title, description, url, type = 'website', jsonld, published, modified, md }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${GTAG}<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"/>
<link rel="canonical" href="${SITE}${url}"/>
<link rel="alternate" type="application/rss+xml" title="COI Journal" href="${SITE}/feed.xml"/>
${md ? `<link rel="alternate" type="text/markdown" title="${esc(title)} (Markdown)" href="${SITE}${url}index.md"/>\n` : ''}<meta name="theme-color" content="#1F201C"/>
<link rel="icon" type="image/svg+xml" href="${FAVICON}"/>
<meta property="og:type" content="${type}"/>
<meta property="og:url" content="${SITE}${url}"/>
<meta property="og:site_name" content="COI Journal"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${SITE}/assets/og.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="COI Journal. Construction insurance compliance, reported. Published by Forsured."/>
${published ? `<meta property="article:published_time" content="${published}"/>\n<meta property="article:modified_time" content="${modified}"/>\n` : ''}<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${SITE}/assets/og.png"/>
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonld }, null, 2)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="${FONTS}"/>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="strip"><div class="wrap">
  <span class="pub" data-disclosure>Published by <a href="${fsLink('/', 'strip')}"><span class="fmark" aria-hidden="true">F</span> Forsured</a></span>
  <a class="tuesday" href="/digest/">Worth Reading in your inbox, every Tuesday</a>
</div></div>`;
}

const NAV = [
  ['/', 'Front page'],
  ['/worth-reading/', 'Worth Reading'],
  ['/spot-the-gap/', 'Spot the Gap'],
  ['/dictionary/', 'The Dictionary'],
  ['/methodology/', 'Data desk'],
  ['/digest/', 'The COI Digest'],
  ['/masthead/', 'Masthead'],
  ['/about/', 'About'],
];

function masthead(current, small) {
  return `<header>
  <div class="band"><div class="wrap">
    <div class="mast${small ? ' small' : ''}">
      ${current === '/' ? '<h1><a class="name" href="/" aria-current="page">COI <span>Journal</span></a></h1>' : '<a class="name" href="/">COI <span>Journal</span></a>'}
      <p class="tag">Construction insurance compliance, reported. The data desk for contractor COIs.</p>
    </div>
    <div class="dateline"><span><b>${EDITION}</b></span><span>Contractor COIs · Endorsements · Project requirements</span><span>${LAUNCH}</span></div>
  </div></div>
  <nav class="secnav wrap" aria-label="Sections">${NAV.map(([h, t]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
</header>`;
}

// The byline: monogram, linked name, role. Falls back to plain text for "The editors".
function byline(a) {
  const p = person(a.author);
  const when = `<time datetime="${a.date}">${human(a.date)}</time>${a.updated !== a.date ? ` · Updated <time datetime="${a.updated}">${human(a.updated)}</time>` : ''}`;
  if (!p) return `<p class="byl">By ${esc(a.byline)} · ${when}</p>`;
  return `<div class="byl">${monogram(p, 40)}<span>By <a href="/people/${p.slug}/">${esc(p.name)}</a>, ${esc(p.role)} · ${when}</span></div>`;
}
const personLd = (p) => ({ '@type': 'Person', '@id': `${SITE}/people/${p.slug}/#person`, name: p.name, jobTitle: p.role, url: `${SITE}/people/${p.slug}/`, worksFor: { '@id': `${SITE}/#publication` }, description: p.bio[0] });

const HOUSE = (campaign) => `<section class="house" aria-labelledby="house-h"><div class="wrap">
  <div>
    <span class="eyebrow">From our publisher</span>
    <h2 id="house-h">Check a contractor COI against your project requirements, free.</h2>
    <p>Forsured, which publishes COI Journal, will read one project's requirements and a contractor COI or two, and show you every gap it finds.</p>
  </div>
  <div class="btns"><a class="btn f" href="${cta(campaign)}">Get a free COI risk check →</a><a class="btn o" href="${fsLink('/', campaign)}">About Forsured</a></div>
</div></section>`;

const LEGAL = `<a href="https://app.forsured.com/terms">Terms of Service</a> and <a href="https://app.forsured.com/privacy">Privacy Policy</a>`;

const FOOTER = (y) => `<footer><div class="wrap">
  <div class="fgrid">
    <div>
      <a class="fname" href="/">COI Journal</a>
      <p data-disclosure>Published by <a href="${fsLink('/', 'footer')}">Forsured</a>, a construction insurance compliance software company. We don't rank or review software vendors. <a href="/principles/">Our principles</a>.</p>
    </div>
    <div><h2>Read</h2><nav aria-label="Footer, read"><a href="/">Front page</a><a href="/spot-the-gap/">Spot the Gap</a><a href="/dictionary/">The COI Dictionary</a><a href="/worth-reading/">Worth Reading</a><a href="/methodology/">The COI Gap Index</a><a href="/digest/">The COI Digest</a><a href="/feed.xml">RSS feed</a></nav></div>
    <div><h2>The Journal</h2><nav aria-label="Footer, the Journal"><a href="/about/">About</a><a href="/masthead/">Masthead</a><a href="/principles/">Publishing principles</a><a href="/gap-of-the-month/">Gap of the Month</a><a href="mailto:${CONTACT}">Contact</a></nav></div>
  </div>
  <div class="fbot">
    <p>General information, not legal or insurance advice. Forsured is not a law firm or a licensed insurance agency. We're not affiliated with the organizations we cite. ${LEGAL.replace(' and ', ' · ')}</p>
    <p>© ${y} Forsured, Inc.</p>
  </div>
</div></footer>`;

// ---------- forms ----------
// Web3Forms emails the team; the Make webhook (once set) adds the person to Attio. Same pattern as forsured.ai.

const ROLES = ['General contractor', 'Insurance broker', 'Trade contractor', 'Project owner or developer', 'Insurance carrier', 'Other'];

function signup(id, placement) {
  return `<section class="sub" aria-labelledby="${id}" data-form="digest" data-placement="${placement}">
  <span class="eyebrow">The weekly email</span>
  <h2 id="${id}">Get The COI Digest</h2>
  <p>Worth Reading, our picks of the week's best construction insurance reporting, plus one term and one gap. Tuesday mornings, five minutes.</p>
  <form novalidate>
    <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true"/>
    <label for="${id}-email">Work email</label>
    <input id="${id}-email" type="email" name="email" autocomplete="email" required aria-describedby="${id}-err"/>
    <label for="${id}-role">I work as a</label>
    <select id="${id}-role" name="role"><option value="">Choose one (optional)</option>${ROLES.map((r) => `<option>${r}</option>`).join('')}</select>
    <button class="btn" type="submit">Subscribe</button>
    <p class="err" id="${id}-err" role="alert" hidden></p>
    <p class="fine" data-legal>By subscribing, you agree to Forsured's ${LEGAL}. Unsubscribe from any email.</p>
  </form>
  <p class="ok" role="status" hidden>You're on the list. The next COI Digest lands Tuesday.</p>
</section>`;
}

function gapForm() {
  return `<section class="gap boxed" aria-labelledby="gap-h" data-form="gap" data-placement="gap-of-the-month">
  <h2 id="gap-h" class="eyebrow">Tell us about a gap</h2>
  <form novalidate>
    <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true"/>
    <label for="gap-email">Work email</label>
    <input id="gap-email" type="email" name="email" autocomplete="email" required aria-describedby="gap-err"/>
    <label for="gap-role">I work as a</label>
    <select id="gap-role" name="role"><option value="">Choose one (optional)</option>${ROLES.map((r) => `<option>${r}</option>`).join('')}</select>
    <label for="gap-story">What happened? No names, policy numbers or documents, please.</label>
    <textarea id="gap-story" name="story" required></textarea>
    <label class="check"><input type="checkbox" name="consent" required/> <span>COI Journal may use my story, with identifying details removed. I'll be credited only if I ask.</span></label>
    <button class="btn" type="submit">Send my story</button>
    <p class="err" id="gap-err" role="alert" hidden></p>
    <p class="fine" data-legal>By submitting, you agree to Forsured's ${LEGAL}.</p>
  </form>
  <p class="ok" role="status" hidden>Thanks. If we pick your story, we'll write back before anything runs.</p>
</section>`;
}

function panelForm() {
  return `<section class="gap boxed" aria-labelledby="panel-h" data-form="panel" data-placement="methodology">
  <h2 id="panel-h" class="eyebrow">Join the broker panel</h2>
  <p class="fine" style="font-size:14.5px;color:var(--ink2)">Construction brokers: four short questions a quarter about what you see breaking and how long fixes take. Answers are anonymous and only ever reported in aggregate.</p>
  <form novalidate>
    <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true"/>
    <label for="panel-email">Work email</label>
    <input id="panel-email" type="email" name="email" autocomplete="email" required aria-describedby="panel-err"/>
    <label for="panel-role">I work as a</label>
    <select id="panel-role" name="role"><option value="">Choose one (optional)</option>${ROLES.map((r) => `<option>${r}</option>`).join('')}</select>
    <button class="btn" type="submit">Join the panel</button>
    <p class="err" id="panel-err" role="alert" hidden></p>
    <p class="fine" data-legal>By joining, you agree to Forsured's ${LEGAL}. Leave the panel any time.</p>
  </form>
  <p class="ok" role="status" hidden>You're on the panel. The first questions arrive with the next quarter.</p>
</section>`;
}

const FORM_JS = `<script>
(() => {
  const RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  const HOOK = '${MAKE_WEBHOOK}';
  for (const box of document.querySelectorAll('[data-form]')) {
    const form = box.querySelector('form');
    const btn = form.querySelector('button');
    const label = btn.textContent;
    const err = form.querySelector('.err');
    const fail = (m) => { err.textContent = m; err.hidden = false; btn.disabled = false; btn.textContent = label; };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!RE.test(email)) { form.email.setAttribute('aria-invalid', 'true'); fail('Enter a work email like name@company.com.'); form.email.focus(); return; }
      form.email.removeAttribute('aria-invalid');
      if (form.story && !form.story.value.trim()) { fail('Tell us what happened.'); form.story.focus(); return; }
      if (form.consent && !form.consent.checked) { fail('Please tick the box so we can use your story.'); return; }
      if (form.botcheck.checked) return;
      err.hidden = true; btn.disabled = true; btn.textContent = 'Sending…';
      const kind = box.dataset.form;
      const subject = kind === 'gap' ? 'COI Journal: Gap of the Month submission' : kind === 'panel' ? 'COI Journal: broker panel signup' : 'COI Digest subscriber';
      const data = { email, role: form.role.value, story: form.story ? form.story.value.trim() : '', form_source: kind === 'gap' ? 'COI Journal Gap' : kind === 'panel' ? 'COI Journal Panel' : 'COI Journal', lead_source: 'COI Journal', placement: box.dataset.placement, page: location.pathname, submitted_at: new Date().toISOString() };
      const w3 = new FormData();
      w3.append('access_key', '${WEB3FORMS_KEY}');
      w3.append('subject', subject);
      w3.append('from_name', 'COI Journal');
      for (const [k, v] of Object.entries(data)) if (v) w3.append(k, v);
      const calls = [fetch('https://api.web3forms.com/submit', { method: 'POST', body: w3 })];
      if (HOOK) calls.push(fetch(HOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, subject }) }).catch(() => null));
      Promise.all(calls)
        .then((r) => r[0].json())
        .then((j) => { if (!j.success) throw new Error(); form.hidden = true; box.querySelector('.ok').hidden = false; })
        .catch(() => fail('Something went wrong. Please try again.'));
    });
  }
})();
</script>`;

const close = (y, forms) => `${forms ? FORM_JS + '\n' : ''}</body>\n</html>\n`;

// ---------- pages ----------

// Plain Speak video: a click-to-load player (nothing loads from YouTube until the reader asks) and
// VideoObject markup. Used only when an article's front matter has "video" with a public YouTube id,
// an upload date and a transcript. No video, no player: we never ship an empty embed.
const video = (a) => `<figure class="video" data-yt="${esc(a.video.youtube)}"><button type="button" aria-label="Play the video: ${esc(a.title)}">▶ Play</button></figure>
<script>document.querySelectorAll('.video[data-yt]').forEach((f)=>f.querySelector('button').addEventListener('click',()=>{f.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+f.dataset.yt+'?autoplay=1" title="Plain Speak video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';}));</script>`;
const videoLd = (a) => ({ '@type': 'VideoObject', name: a.title, description: a.description, uploadDate: a.video.uploadDate, duration: a.video.duration, thumbnailUrl: `https://i.ytimg.com/vi/${a.video.youtube}/hqdefault.jpg`, embedUrl: `https://www.youtube-nocookie.com/embed/${a.video.youtube}`, transcript: a.video.transcript, publisher: { '@id': PUBLISHER['@id'] } });

function frontPage(arts, reading) {
  const lead = arts[0];
  const y = year(lead.date);
  return `${head({
    title: 'COI Journal | Construction insurance compliance, reported',
    description: 'COI Journal reports on construction insurance compliance: contractor COIs, endorsements, project requirements and who pays when coverage fails. Published by Forsured.',
    url: '/',
    jsonld: [PUBLISHER, WEBSITE, { '@type': 'WebPage', '@id': `${SITE}/#webpage`, url: `${SITE}/`, name: 'COI Journal', isPartOf: { '@id': WEBSITE['@id'] }, about: 'Construction insurance compliance' }],
  })}
${masthead('/')}
<main id="main" class="wrap">
  <div class="front">
    <article class="lead">
      <div class="kick"><span class="eyebrow">${esc(lead.section)}</span>${stamp(lead.docket)}</div>
      <h2><a href="${lead.url}">${esc(lead.title)}</a></h2>
      <p class="dek">${esc(lead.dek)}</p>
      ${byline(lead)}
      ${blueprint({ sheet: lead.sheet || 'A-001', title: lead.title, docket: lead.docket, date: lead.date, motif: lead.art || 'gap' })}
      <ul>${lead.takeaways.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>
      <a class="more" href="${lead.url}">Read the editors' note</a>
    </article>
    <aside class="side" aria-label="Subscribe and submit">
      ${signup('sub-front', 'front')}
      <div class="clip">
        <span class="eyebrow">Reader submissions</span>
        <h3>Gap of the Month</h3>
        <p>Had a coverage gap catch you out? Tell us what happened. We pick one each month and explain the check that would have caught it.</p>
        <a href="/gap-of-the-month/">Send us a gap</a>
      </div>
      <div class="clip">
        <span class="eyebrow">The masthead</span>
        <h3>Written by people who sign, issue and chase COIs</h3>
        <p>A GC owner, a contractor operator, a construction broker and two editors.</p>
        <a href="/masthead/">Meet the masthead</a>
      </div>
    </aside>
  </div>

  ${reading.length ? `<section class="block feature" aria-labelledby="wr-h">
    <div class="feat-head"><div><span class="eyebrow">Our weekly column · Picked the week of ${human(reading[0].picked)}</span>
    <h2 id="wr-h">Worth Reading</h2>
    <p>The best construction insurance reporting from everywhere else, read in full and boiled down to a few lines, with why it matters and a link to the original.</p></div>
    <a class="btn" href="#sub-front">Get Worth Reading every Tuesday</a></div>
    <div class="picks3">${reading.slice(0, 3).map(pickCard).join('')}</div>
    <a class="more" href="/worth-reading/">All ${reading.length} picks this week</a>
  </section>` : ''}

  ${theNumber()}

  <section class="block tease" aria-labelledby="spot-h">
    <span class="eyebrow">Spot the Gap · The worked example</span>
    <div class="duo">
      <div>
        <h2 id="spot-h" class="sr">Spot the Gap</h2>
        <h3>This certificate looks fine. Four of its five lines fail the project.</h3>
        <p>Here's the worked example, answered. Each round is a specimen certificate checked against a set of project requirements. Rounds 2 and 3 are yours: mark what you think fails, then check your answers.</p>
        <a class="btn" href="/spot-the-gap/">Play Spot the Gap</a>
      </div>
      ${specimen()}
    </div>
  </section>


  <section class="panel" aria-labelledby="nums-h">
    <span class="eyebrow">The COI Gap Index · First edition 2027</span>
    <h2 id="nums-h">Three numbers nobody in construction publishes. We're building them.</h2>
    <p>Each one runs only when its sample clears our <a href="/methodology/">rules</a>, with the sample size printed next to it.</p>
    <div class="nums">${NUMBERS.map(([k, d, src], i) => `<div class="num"><div class="k">Headline number ${i + 1}</div><h3>${k}</h3><p>${d}</p><span class="chip">Not yet published</span><div class="src"><b>Built from</b>${src}</div></div>`).join('')}</div>
    ${gapline(['Collect the data', 'Clear the sample rules', 'Publish with sample size'])}
    <p class="panel-cta"><a class="btn" href="/methodology/#panel-h">Brokers: join the panel</a><a class="btn o" href="${cta('gap-index')}">GCs: add your COIs with a free risk check</a></p>
  </section>

  <section class="block" aria-labelledby="dict-h">
    <span class="eyebrow">The COI Dictionary</span>
    <h2 id="dict-h">The words that decide who pays, with the form numbers</h2>
    <p>Each entry says what the term means, how it shows up on a certificate, what to check and where it usually breaks.</p>
    ${termCards(TERMS)}
  </section>

  <section class="block" aria-labelledby="secs-h">
    <span class="eyebrow">What we publish</span>
    <h2 id="secs-h">Five desks, one beat</h2>
    <div class="secs">${SECTIONS.map(([t, d, h]) => `<div class="sec"><h3><a href="${h}">${t}</a></h3><p>${d}</p></div>`).join('')}</div>
  </section>

  <section class="block" aria-labelledby="lib-h">
    <span class="eyebrow">COI 101 · From our publisher's library</span>
    <h2 id="lib-h">Go deeper</h2>
    <p>Longer explainers on the same terms. They live on forsured.ai, our publisher's site.</p>
    <ul class="lib">${LIBRARY.map(([p, t]) => `<li><a href="${fsLink(p, 'library')}">${esc(t)}</a><span>forsured.ai</span></li>`).join('')}</ul>
  </section>
</main>
${HOUSE('front')}
${FOOTER(y)}
${close(y, true)}`;
}

const termCards = (list) => `<ul class="terms">${list.map((t) => `<li><a href="/dictionary/${t.slug}/"><strong>${esc(t.term)}</strong><span class="d">${esc(t.def.split('. ')[0].replace(/\.$/, ''))}.</span><span class="fs">${t.forms.map((f) => `<span class="formno">${f}</span>`).join('')}</span></a></li>`).join('')}</ul>`;

function articlePage(a, arts) {
  const y = year(a.date);
  const graph = [
    {
      '@type': 'NewsArticle',
      '@id': `${SITE}${a.url}#article`,
      headline: a.title,
      description: a.description,
      image: [`${SITE}/assets/og.png`],
      datePublished: a.date,
      dateModified: a.updated,
      author: person(a.author) ? { '@id': personLd(person(a.author))['@id'] } : { '@type': 'Organization', name: `COI Journal (${a.byline})`, url: `${SITE}/about/` },
      identifier: a.docket,
      publisher: { '@id': PUBLISHER['@id'] },
      mainEntityOfPage: `${SITE}${a.url}`,
      articleSection: a.section,
      isAccessibleForFree: true,
      inLanguage: 'en-US',
      isPartOf: { '@id': WEBSITE['@id'] },
    },
    ...(person(a.author) ? [personLd(person(a.author))] : []),
    ...(a.video ? [videoLd(a)] : []),
    PUBLISHER,
    WEBSITE,
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'COI Journal', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: a.title, item: `${SITE}${a.url}` }] },
  ];
  return `${head({ title: `${a.title} | COI Journal`, description: a.description, url: a.url, type: 'article', jsonld: graph, published: a.date, modified: a.updated, md: true })}
${masthead(a.url, true)}
<main id="main" class="wrap">
  <article class="col art">
    <div class="kick"><span class="eyebrow">${esc(a.section)}</span>${stamp(a.docket, a.date)}</div>
    <h1>${esc(a.title)}</h1>
    <p class="dek">${esc(a.dek)}</p>
    ${byline(a)}
    ${a.video ? video(a) : blueprint({ sheet: a.sheet || 'A-001', title: a.title, docket: a.docket, date: a.date, motif: a.art || 'gap' })}
    <section class="tldr" aria-labelledby="tldr-h"><h2 id="tldr-h">The short version</h2><ul>${a.takeaways.map((t) => `<li>${inline(t)}</li>`).join('')}</ul></section>
    <div class="prose">
${markdown(a.body)}
    </div>
${a.sources.length ? `    <section class="sources" aria-labelledby="src-h"><h2 id="src-h">Sources</h2><ol>${a.sources.map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a>${s.publisher ? `, ${esc(s.publisher)}` : ''}${s.date ? `, ${esc(s.date)}` : ''}</li>`).join('')}</ol></section>\n` : ''}    <p class="disclose" data-disclosure>COI Journal is published by Forsured, which sells construction insurance compliance software.${person(a.author) ? ` ${esc(person(a.author).disclose)}` : ''} <a href="/principles/">How we keep editorial separate</a>.</p>
    <div class="boxed">${signup('sub-art', 'article')}</div>
  </article>
</main>
${HOUSE('article')}
${FOOTER(y)}
${close(y, true)}`;
}

function staticPage(p, y) {
  const forms = p.signup || p.gapForm || p.panelForm;
  return `${head({
    title: `${p.title} | COI Journal`,
    description: p.description,
    url: p.url,
    jsonld: [{ '@type': p.url === '/about/' ? 'AboutPage' : 'WebPage', '@id': `${SITE}${p.url}#webpage`, url: `${SITE}${p.url}`, name: p.title, description: p.description, isPartOf: { '@id': WEBSITE['@id'] }, publisher: { '@id': PUBLISHER['@id'] } }, PUBLISHER, WEBSITE],
  })}
${masthead(p.url, true)}
<main id="main" class="wrap">
  <article class="col art">
    <span class="eyebrow">COI Journal</span>
    <h1>${esc(p.title)}</h1>
    <p class="dek">${esc(p.dek)}</p>
${p.signup ? `    <div class="boxed">${signup('sub-page', 'digest-page')}</div>\n` : ''}    <div class="prose">
${markdown(p.body)}
    </div>
${p.gapForm ? `    ${gapForm()}\n` : ''}${p.panelForm ? `    ${panelForm()}\n` : ''}  </article>
</main>
${HOUSE(p.slug)}
${FOOTER(y)}
${close(y, forms)}`;
}

// ---------- desk pages: masthead, people, dictionary, Spot the Gap ----------

function shell({ title, description, url, jsonld, body, campaign, y, js = '' }) {
  return `${head({ title, description, url, jsonld: [...jsonld, PUBLISHER, WEBSITE] })}
${masthead(url, true)}
<main id="main" class="wrap">
${body}
</main>
${HOUSE(campaign)}
${FOOTER(y)}
${js}</body>
</html>
`;
}
const crumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: [['COI Journal', '/'], ...items].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: `${SITE}${u}` })) });

function mastheadPage(y) {
  return shell({
    title: 'Masthead | COI Journal',
    description: 'Who writes and edits COI Journal: a GC owner, a contractor operator, a construction broker and two editors. Every connection to Forsured is disclosed.',
    url: '/masthead/',
    campaign: 'masthead',
    y,
    jsonld: [{ '@type': 'WebPage', '@id': `${SITE}/masthead/#webpage`, url: `${SITE}/masthead/`, name: 'Masthead', isPartOf: { '@id': WEBSITE['@id'] }, mainEntity: { '@type': 'ItemList', itemListElement: PEOPLE.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: personLd(p) })) } }, crumbs([['Masthead', '/masthead/']])],
    body: `  <article class="art">
    <div class="col">
      <span class="eyebrow">The masthead</span>
      <h1>Who makes COI Journal</h1>
      <p class="dek">People who sign, issue and chase contractor certificates for a living. Everyone here works with Forsured, our publisher, and every byline says how.</p>
    </div>
    <div class="people">${PEOPLE.map((p) => `<div class="card">${monogram(p)}<div><h2><a href="/people/${p.slug}/">${esc(p.name)}</a></h2><p class="role">${esc(p.role)}</p><p>${esc(p.line)}</p><p>${esc(p.disclose)}</p></div></div>`).join('')}</div>
    <div class="col"><p class="disclose" data-disclosure>COI Journal is published by Forsured, which sells construction insurance compliance software. Contributors with a business connection to Forsured say so in their byline. <a href="/principles/">Our principles</a>.</p></div>
  </article>`,
  });
}

function personPage(p, arts, y) {
  const mine = arts.filter((a) => a.author === p.slug);
  return shell({
    title: `${p.name}, ${p.role} | COI Journal`,
    description: `${p.name} is ${/^[AEIOU]/.test(p.role) ? 'an' : 'a'} ${p.role.toLowerCase()} at COI Journal. ${p.line}. Bio, beats and disclosures.`.slice(0, 168),
    url: `/people/${p.slug}/`,
    campaign: 'masthead',
    y,
    jsonld: [{ '@type': 'ProfilePage', '@id': `${SITE}/people/${p.slug}/#webpage`, url: `${SITE}/people/${p.slug}/`, name: p.name, isPartOf: { '@id': WEBSITE['@id'] }, mainEntity: personLd(p) }, crumbs([['Masthead', '/masthead/'], [p.name, `/people/${p.slug}/`]])],
    body: `  <article class="col art">
    <span class="eyebrow">The masthead</span>
    <div class="who">${monogram(p, 96)}<div><h1>${esc(p.name)}</h1><p class="role eyebrow">${esc(p.role)}</p></div></div>
    <p class="dek">${esc(p.line)}</p>
    <div class="prose">${p.bio.map((b) => `<p>${esc(b)}</p>`).join('')}</div>
    <ul class="tags" aria-label="Covers">${p.covers.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    ${mine.length ? `<section class="block"><span class="eyebrow">Published</span><ul class="lib">${mine.map((a) => `<li><a href="${a.url}">${esc(a.title)}</a><span>${human(a.date)} · ${esc(a.docket)}</span></li>`).join('')}</ul></section>` : ''}
    <p class="disclose" data-disclosure>Disclosure: ${esc(p.disclose)} COI Journal is published by Forsured. <a href="/principles/">Our principles</a>.</p>
    <p class="rel"><a href="/masthead/">The whole masthead</a></p>
  </article>`,
  });
}

function dictionaryPage(y) {
  return shell({
    title: 'The COI Dictionary | COI Journal',
    description: 'Plain-English definitions of the certificate of insurance terms that decide who pays on a construction project, with the ISO and ACORD form numbers.',
    url: '/dictionary/',
    campaign: 'dictionary',
    y,
    jsonld: [{ '@type': 'DefinedTermSet', '@id': `${SITE}/dictionary/#set`, name: 'The COI Dictionary', url: `${SITE}/dictionary/`, publisher: { '@id': PUBLISHER['@id'] }, hasDefinedTerm: TERMS.map((t) => ({ '@id': `${SITE}/dictionary/${t.slug}/#term` })) }, crumbs([['The COI Dictionary', '/dictionary/']])],
    body: `  <article class="art">
    <div class="col">
      <span class="eyebrow">The COI Dictionary</span>
      <h1>The words that decide who pays</h1>
      <p class="dek">One entry per term: what it means, how it shows up on a certificate, what to check and where it usually breaks. Form numbers included.</p>
    </div>
    ${termCards(TERMS)}
    <div class="col"><p class="disclose">General information, not legal or insurance advice. Form numbers refer to ISO and ACORD forms; carriers also use their own versions. Ask your broker what your policies actually carry.</p></div>
  </article>`,
  });
}

function termPage(t, y) {
  const url = `/dictionary/${t.slug}/`;
  return shell({
    title: `${t.short}: what it means on a COI | COI Journal`.length <= 70 ? `${t.short}: what it means on a COI | COI Journal` : `${t.short} | COI Journal`,
    description: t.def.length <= 170 ? t.def : `${t.def.split('. ')[0].replace(/\.$/, '')}.`,
    url,
    campaign: 'dictionary',
    y,
    jsonld: [{ '@type': 'DefinedTerm', '@id': `${SITE}${url}#term`, name: t.term, description: t.def, termCode: t.forms.join(', '), url: `${SITE}${url}`, inDefinedTermSet: { '@id': `${SITE}/dictionary/#set` } }, crumbs([['The COI Dictionary', '/dictionary/'], [t.short, url]])],
    body: `  <article class="col art">
    <span class="eyebrow">The COI Dictionary</span>
    <h1>${esc(t.term)}</h1>
    <div class="defbox"><span class="k">Definition</span><p>${esc(t.def)}</p>${t.forms.map((f) => `<span class="formno">${f}</span>`).join('')}</div>
    <div class="trio">${t.sections.map(([h, b]) => `<section><h2>${esc(h)}</h2><p>${esc(b)}</p></section>`).join('')}</div>
    <p class="rel">Go deeper on forsured.ai: <a href="${fsLink(t.lib[0], 'dictionary')}">${esc(t.lib[1])}</a></p>
    <p class="rel">Related: ${t.related.map((r) => `<a href="/dictionary/${r}/">${esc(term(r).short)}</a>`).join(' · ')} · <a href="/spot-the-gap/">Try Spot the Gap</a></p>
    <p class="disclose">General information, not legal or insurance advice. Ask your broker what your policies actually carry.</p>
  </article>`,
  });
}

function roundPlay(r, i) {
  const fails = r.rows.filter((x) => x[3]).length;
  return `<section class="round" aria-labelledby="r-${r.slug}" data-round>
  <h2 id="r-${r.slug}">${esc(r.title)}</h2>
  <p>${esc(r.insured)} · ${esc(r.project)}. Mark every line you think fails the project requirements.</p>
  <div class="spec"><div class="spec-doc">
    <div class="spec-top"><span>Certificate of liability insurance</span><span class="spec-tag">Specimen</span></div>
    <div class="spec-scroll" tabindex="0" role="region" aria-label="${esc(r.title)}"><table>
      <thead><tr><th scope="col">Coverage</th><th scope="col">Project requires</th><th scope="col">Certificate shows</th><th scope="col">Your call</th></tr></thead>
      <tbody>${r.rows.map(([c, q, o, g]) => `<tr data-fails="${g ? 1 : 0}"><th scope="row">${esc(c)}</th><td>${esc(q)}</td><td>${esc(o)}</td><td><button type="button" class="pick" aria-pressed="false">Fails?</button></td></tr>`).join('')}</tbody>
    </table></div>
    <div class="spec-foot"><button type="button" class="btn" data-check>Check my answers</button><span class="result" role="status"></span></div>
  </div></div>
  <details class="answers"><summary>Answers: ${fails} of ${r.rows.length} lines fail</summary><ol>${r.rows.filter((x) => x[3]).map(([c, , , g, slug]) => `<li><strong>${esc(c)}.</strong> ${esc(g)}${slug ? ` <a href="/dictionary/${slug}/">${esc(term(slug).short)}, explained</a>` : ''}</li>`).join('')}</ol></details>
</section>`;
}

const SPOT_JS = `<script>
document.querySelectorAll('[data-round]').forEach((round) => {
  round.querySelectorAll('.pick').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on); b.textContent = on ? 'Fails' : 'Fails?';
  }));
  round.querySelector('[data-check]').addEventListener('click', () => {
    let right = 0, missed = 0, wrong = 0;
    round.querySelectorAll('tbody tr').forEach((tr) => {
      const fails = tr.dataset.fails === '1', picked = tr.querySelector('.pick').getAttribute('aria-pressed') === 'true';
      tr.classList.toggle('hit', fails && picked); tr.classList.toggle('miss', fails && !picked);
      if (fails && picked) right++; else if (fails) missed++; else if (picked) wrong++;
    });
    const total = right + missed;
    round.querySelector('.result').textContent = right === total && !wrong ? 'All ' + total + ' found. Your file is safer than most.' : right + ' of ' + total + ' found' + (wrong ? ', ' + wrong + ' false alarm' + (wrong > 1 ? 's' : '') : '') + '. The answers are below.';
    round.querySelector('details').open = true;
  });
});
</script>
`;

function spotPage(y) {
  return shell({
    title: 'Spot the Gap: can you find what fails? | COI Journal',
    description: 'Spot the Gap: a specimen contractor certificate of insurance and a set of project requirements. Find every line that fails, then check your answers.',
    url: '/spot-the-gap/',
    campaign: 'spot-the-gap',
    y,
    js: SPOT_JS,
    jsonld: [{ '@type': 'WebPage', '@id': `${SITE}/spot-the-gap/#webpage`, url: `${SITE}/spot-the-gap/`, name: 'Spot the Gap', isPartOf: { '@id': WEBSITE['@id'] }, about: TERMS.map((t) => ({ '@id': `${SITE}/dictionary/${t.slug}/#term` })) }, crumbs([['Spot the Gap', '/spot-the-gap/']])],
    body: `  <article class="col art">
    <span class="eyebrow">Spot the Gap</span>
    <h1>Can you find what fails?</h1>
    <p class="dek">Every round is a specimen certificate of insurance next to the project's requirements. The certificate always looks fine. Your job is to find the lines that aren't.</p>
    <section class="round" aria-labelledby="r-worked"><h2 id="r-worked">The worked example</h2><p>Four of five lines fail. Here's what we flag, and why.</p>${specimen(ROUNDS[0], { caption: false })}
      <details class="answers" open><summary>Why they fail</summary><ol>${ROUNDS[0].rows.filter((x) => x[3]).map(([c, , , g, slug]) => `<li><strong>${esc(c)}.</strong> ${esc(g)}${slug ? ` <a href="/dictionary/${slug}/">${esc(term(slug).short)}, explained</a>` : ''}</li>`).join('')}</ol></details></section>
    ${ROUNDS.slice(1).map(roundPlay).join('\n')}
    <p class="disclose">Specimens. Sample data, not real contractors. General information, not legal or insurance advice. New rounds run in The COI Digest. <a href="/digest/">Get it on Tuesdays</a>.</p>
  </article>`,
  });
}

const pickCard = (k) => `<article class="pick-card">
  <p class="src-line"><span class="outlet">${esc(k.publisher)}</span>${k.author ? ` · ${esc(k.author)}` : ''} · <time datetime="${k.date}">${human(k.date)}</time></p>
  <h3><a href="${esc(k.url)}" rel="noopener">${esc(k.title)}</a></h3>
  <p>${esc(k.summary)}</p>
  <p class="why"><b>Why it matters</b>${esc(k.why)}</p>
  <a class="out" href="${esc(k.url)}" rel="noopener">Read the full story at ${esc(k.publisher)} ↗</a>
</article>`;

function readingPage(list, y) {
  const weeks = [...new Set(list.map((k) => k.picked))];
  return shell({
    title: 'Worth Reading: the best COI reporting elsewhere | COI Journal',
    description: 'Worth Reading: the week\'s best construction insurance reporting from other outlets, summarized in a few lines by COI Journal with a link to the full story.',
    url: '/worth-reading/',
    campaign: 'worth-reading',
    y,
    js: FORM_JS + '\n',
    jsonld: [{ '@type': 'CollectionPage', '@id': `${SITE}/worth-reading/#webpage`, url: `${SITE}/worth-reading/`, name: 'Worth Reading', isPartOf: { '@id': WEBSITE['@id'] }, citation: list.map((k) => ({ '@type': 'NewsArticle', headline: k.title, url: k.url, datePublished: k.date, publisher: { '@type': 'Organization', name: k.publisher }, ...(k.author ? { author: { '@type': 'Person', name: k.author } } : {}) })) }, crumbs([['Worth Reading', '/worth-reading/']])],
    body: `  <article class="col art">
    <span class="eyebrow">Worth Reading</span>
    <h1>The best COI reporting, wherever it runs</h1>
    <p class="dek">Each week we pick the construction insurance stories worth your time from other outlets. A few lines in our own words, why it matters, and a link to the full piece. Read theirs.</p>
    <div class="boxed">${signup('sub-wr', 'worth-reading').replace('Get The COI Digest', 'Get Worth Reading every Tuesday').replace('The weekly email', 'In The COI Digest')}</div>
    ${weeks.map((w) => `<section class="week" aria-labelledby="w-${w}"><h2 id="w-${w}" class="eyebrow">Picked the week of ${human(w)}</h2>${list.filter((k) => k.picked === w).map(pickCard).join('')}</section>`).join('')}
    <p class="disclose">Summaries are COI Journal's own. We link to the original and don't republish it. We're not affiliated with these outlets, and we never take payment for a pick. Know a story we missed? <a href="mailto:${CONTACT}">Send it to us</a>.</p>
  </article>`,
  });
}

// The preview issue: what a COI Digest looks like, built only from content already on the site.
function issuePage(reading, y) {
  const t = term('additional-insured');
  const r2 = ROUNDS[1];
  const n = THE_NUMBER;
  return shell({
    title: 'The COI Digest, No. 0: the preview issue | COI Journal',
    description: 'The COI Digest preview issue: this week\'s Worth Reading picks, the week in COI, one Dictionary term, one Spot the Gap round and The Number.',
    url: '/digest/issue-0/',
    campaign: 'digest-issue-0',
    y,
    js: FORM_JS + '\n',
    jsonld: [{ '@type': 'WebPage', '@id': `${SITE}/digest/issue-0/#webpage`, url: `${SITE}/digest/issue-0/`, name: 'The COI Digest, No. 0', isPartOf: { '@id': WEBSITE['@id'] } }, crumbs([['The COI Digest', '/digest/'], ['No. 0', '/digest/issue-0/']])],
    body: `  <article class="col art issue">
    <span class="eyebrow">The COI Digest · ${EDITION} · Preview issue</span>
    <h1>The COI Digest, No. 0</h1>
    <p class="dek">This is what lands in your inbox every Tuesday. Five minutes, four parts. Issue No. 1 goes out with the launch in December.</p>
    <section class="ipart"><h2 class="eyebrow">1 · Worth Reading</h2>${reading.slice(0, 3).map(pickCard).join('')}<p class="rel"><a href="/worth-reading/">All ${reading.length} picks this week</a></p></section>
    <section class="ipart"><h2 class="eyebrow">2 · The week in COI</h2><ul class="briefs">${reading.slice(3).map((k) => `<li><a href="${esc(k.url)}" rel="noopener">${esc(k.title)}</a> <span>${esc(k.publisher)}, ${human(k.date)}</span></li>`).join('')}</ul></section>
    <section class="ipart"><h2 class="eyebrow">3 · One term</h2><div class="defbox"><span class="k">${esc(t.term)}</span><p>${esc(t.def)}</p>${t.forms.map((f) => `<span class="formno">${f}</span>`).join('')}</div><p class="rel"><a href="/dictionary/${t.slug}/">Read the full entry</a></p></section>
    <section class="ipart"><h2 class="eyebrow">4 · One gap</h2><p class="lead-in">${esc(r2.insured)} sent a certificate for ${esc(r2.project.toLowerCase())}. ${r2.rows.filter((x) => x[3]).length} of its ${r2.rows.length} lines fail the project's requirements. Can you find them?</p><p class="rel"><a class="btn" href="/spot-the-gap/#r-${r2.slug}">Play this round</a></p></section>
    <section class="ipart"><h2 class="eyebrow">The Number</h2><p class="lead-in"><strong>${esc(n.figure)} ${esc(n.unit)}.</strong> ${esc(n.what)} <a href="${esc(n.source.url)}">${esc(n.source.publisher)}</a>, ${esc(n.source.date)}. Our markup is on the <a href="/#num-h">front page</a>.</p></section>
    <div class="boxed">${signup('sub-issue', 'digest-issue-0').replace('Get The COI Digest', 'Get No. 1 in December')}</div>
  </article>`,
  });
}

function notFound(y) {
  return `${head({ title: 'Page not found | COI Journal', description: "That page isn't here. It may have moved. Start from the COI Journal front page or the publishing principles.", url: '/404.html', jsonld: [PUBLISHER, WEBSITE] }).replace('index, follow, max-image-preview:large, max-snippet:-1', 'noindex')}
${masthead('', true)}
<main id="main" class="wrap"><article class="col art"><span class="eyebrow">404</span><h1>That page isn't here.</h1><p class="dek">It may have moved. Try the <a href="/">front page</a>.</p></article></main>
${FOOTER(y)}
${close(y, false)}`;
}

// ---------- feeds and discovery files ----------

function feed(arts) {
  const items = arts
    .map((a) => `  <item>\n    <title>${esc(a.title)}</title>\n    <link>${SITE}${a.url}</link>\n    <guid isPermaLink="true">${SITE}${a.url}</guid>\n    <pubDate>${new Date(a.date).toUTCString()}</pubDate>\n    <category>${esc(a.section)}</category>\n    <description>${esc(a.description)}</description>\n  </item>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>COI Journal</title>\n  <link>${SITE}/</link>\n  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>\n  <description>Construction insurance compliance, reported. Published by Forsured.</description>\n  <language>en-us</language>\n  <lastBuildDate>${new Date(arts[0].updated).toUTCString()}</lastBuildDate>\n${items}\n</channel>\n</rss>\n`;
}

const DESK_URLS = ['/masthead/', ...PEOPLE.map((p) => `/people/${p.slug}/`), '/dictionary/', ...TERMS.map((t) => `/dictionary/${t.slug}/`), '/spot-the-gap/', '/worth-reading/', '/digest/issue-0/'];

function sitemap(arts, pgs) {
  const urls = [['/', arts[0].updated], ...arts.map((a) => [a.url, a.updated]), ...pgs.map((p) => [p.url, p.updated || arts[0].updated]), ...DESK_URLS.map((u) => [u, arts[0].updated])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d.slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}

const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;

function llms(arts, pgs) {
  return `# COI Journal\n\n> A publication about construction insurance compliance: contractor certificates of insurance (COIs), endorsements, project requirements and who pays when coverage fails. Published by Forsured (${FORSURED}), a construction insurance compliance software company. COI Journal does not rank or review software vendors.\n\n## Articles\n\n${arts.map((a) => `- [${a.title}](${SITE}${a.url}index.md): ${a.description}`).join('\n')}\n\n## About the publication\n\n${pgs.map((p) => `- [${p.title}](${SITE}${p.url}): ${p.description}`).join('\n')}\n\n## The COI Dictionary\n\n${TERMS.map((t) => `- [${t.term}](${SITE}/dictionary/${t.slug}/): ${t.def}`).join('\n')}\n\n## Masthead\n\n${PEOPLE.map((p) => `- [${p.name}](${SITE}/people/${p.slug}/), ${p.role}. ${p.disclose}`).join('\n')}\n\n## Reference explainers (on the publisher's site)\n\n${LIBRARY.map(([p, t]) => `- [${t}](${FORSURED}${p})`).join('\n')}\n`;
}

const articleMd = (a) => `# ${a.title}\n\n${a.dek}\n\nBy ${a.byline}, COI Journal. ${human(a.date)}. Published by Forsured.\n\n## The short version\n\n${a.takeaways.map((t) => `- ${plain(t)}`).join('\n')}\n\n${a.body.replace(/\]\(\//g, `](${SITE}/`)}\n`;

// The welcome email the Make scenario sends each new Digest subscriber (fetched at send time).
// Table layout and inline styles only, because email clients drop most CSS.
function welcome() {
  const p = (t) => `<p style="margin:0 0 16px;font:16px/1.6 Georgia,'Times New Roman',serif;color:#1F201C">${t}</p>`;
  const a = (h, t) => `<a href="${h}" style="color:#1F201C;text-decoration:underline">${t}</a>`;
  const ut = (u) => `${u}${u.includes('?') ? '&' : '?'}utm_source=email&utm_medium=digest&utm_campaign=welcome`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Welcome to The COI Digest</title></head>
<body style="margin:0;padding:0;background-color:#F7F4EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F7F4EE"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px" bgcolor="#FFFDF9">
<tr><td bgcolor="#1F201C" style="padding:28px 32px 18px;text-align:center;border-bottom:4px solid #D9A227">
<div style="font:600 34px/1 Georgia,'Times New Roman',serif;color:#F4F0E8;letter-spacing:-.5px">The COI <span style="color:#D9A227">Digest</span></div>
<div style="font:12px/1.4 'Courier New',monospace;color:#D9A227;margin-top:10px;text-transform:uppercase;letter-spacing:1.5px">From COI Journal · ${EDITION} · Published by Forsured</div>
</td></tr>
<tr><td style="padding:28px 32px 8px">
${p('Thanks for subscribing.')}
${p('The COI Digest lands Tuesday mornings. Five minutes, four parts:')}
<ul style="margin:0 0 16px;padding-left:20px;font:16px/1.6 Georgia,'Times New Roman',serif;color:#1F201C">
<li><strong>Worth Reading.</strong> Our weekly column: the best construction insurance stories from other publications, summarized in a few lines, with a link to each full piece.</li>
<li><strong>The week in COI.</strong> Rule, court and carrier changes that change what you check.</li>
<li><strong>One term.</strong> An entry from the COI Dictionary, in plain English.</li>
<li><strong>One gap.</strong> A new round of Spot the Gap.</li>
</ul>
${p(`This week's Worth Reading picks are already up: ${a(ut(`${SITE}/worth-reading/`), 'read them here')}.`)}
${p(`While you wait for the first issue, try ${a(ut(`${SITE}/spot-the-gap/`), 'Spot the Gap')}: a specimen certificate, a set of project requirements, and two rounds to find what fails. Or start with the ${a(ut(`${SITE}/dictionary/`), 'COI Dictionary')}.`)}
${p(`Had a coverage gap catch you out? ${a(ut(`${SITE}/gap-of-the-month/`), 'Tell us about it')}. We pick one each month.`)}
</td></tr>
<tr><td style="padding:8px 32px 28px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#D9A227" style="border-radius:6px"><a href="${ut(`${FORSURED}/`)}#demo" style="display:inline-block;padding:12px 18px;font:600 15px/1 Arial,sans-serif;color:#1F201C;text-decoration:none">Get a free COI risk check from Forsured</a></td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #D9D3C7;font:12px/1.6 Arial,sans-serif;color:#67635B">
COI Journal and The COI Digest are published by Forsured, a construction insurance compliance software company. Reply "stop" to unsubscribe. ${a('https://app.forsured.com/privacy', 'Privacy Policy')}
</td></tr>
</table></td></tr></table>
</body></html>
`;
}

// ---------- write ----------

function build() {
  const arts = articles();
  const pgs = pages();
  const reading = picks();
  if (!arts.length) throw new Error('need at least one article');
  const y = year(arts[0].updated);
  const files = {
    'index.html': frontPage(arts, reading),
    '404.html': notFound(y),
    'feed.xml': feed(arts),
    'sitemap.xml': sitemap(arts, pgs),
    'robots.txt': robots(),
    'llms.txt': llms(arts, pgs),
    'email/welcome.html': welcome(),
  };
  for (const a of arts) {
    files[`articles/${a.slug}/index.html`] = articlePage(a, arts);
    files[`articles/${a.slug}/index.md`] = articleMd(a);
  }
  for (const p of pgs) files[`${p.url.slice(1)}index.html`] = staticPage(p, y);
  files['masthead/index.html'] = mastheadPage(y);
  for (const p of PEOPLE) files[`people/${p.slug}/index.html`] = personPage(p, arts, y);
  files['dictionary/index.html'] = dictionaryPage(y);
  for (const t of TERMS) files[`dictionary/${t.slug}/index.html`] = termPage(t, y);
  files['spot-the-gap/index.html'] = spotPage(y);
  if (reading.length) files['worth-reading/index.html'] = readingPage(reading, y);
  if (reading.length >= 4) files['digest/issue-0/index.html'] = issuePage(reading, y);
  for (const f of Object.keys(files)) if (/—/.test(files[f])) throw new Error(`${f}: contains an em dash`);
  return files;
}

const files = build();
let stale = [];
for (const [rel, content] of Object.entries(files)) {
  const out = path.join(ROOT, rel);
  const now = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
  if (now === content) continue;
  if (CHECK) stale.push(rel);
  else {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, content);
    console.log('wrote', rel);
  }
}
if (CHECK && stale.length) {
  console.error(`Out of date, run node tools/build.js: ${stale.join(', ')}`);
  process.exit(1);
}
module.exports = { build, SITE };
