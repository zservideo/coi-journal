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
const MAKE_WEBHOOK = '';
const LAUNCH = 'Launching December 2026';

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

const SECTIONS = [
  ['News desk', 'Carrier, state and court changes that change what a GC or broker has to check.'],
  ['COI 101', 'One term at a time: additional insured, waiver of subrogation, per project aggregate.'],
  ['COI Watch', 'A running log of rating changes, new endorsement forms, rule changes and big project awards.'],
  ['The Claim File', 'One case a month from public records: what the COI said, what the policy said, who paid.'],
  ['The COI Gap Index', 'Our flagship research on how often contractor COIs fail project requirements, and why.'],
];

const NUMBERS = [
  ['Gap rate', 'Share of contractor COIs that fail at least one project requirement, and the top reasons why.', 'Shared GC archives and free COI risk checks, anonymized'],
  ['Broker view', 'What construction brokers see breaking most often, and how long a fix takes.', 'A standing quarterly panel of construction brokers'],
  ['Owner rules', 'What public owners actually require from contractors, compared state by state.', 'Insurance sections of public bid documents'],
];

// The specimen certificate on the front page: sample data drawn in the Forsured product style,
// never a real contractor. [coverage, required, on the certificate, null for meets or the gap reason]
const SPECIMEN = [
  ['General liability', '$1M / $2M', '$1M / $2M', null],
  ['Additional insured', 'CG 20 10 + CG 20 37', 'Box checked, no endorsement', 'No endorsement attached'],
  ['Umbrella', '$10M', '$5M', '$5M short'],
  ['Workers\' comp', 'Statutory + waiver', 'Statutory, no waiver', 'Waiver missing'],
  ['Policy term', 'Through Aug 2027', 'Expires Mar 2027', 'Lapses mid-project'],
];

function specimen() {
  const fails = SPECIMEN.filter((r) => r[3]).length;
  return `<figure class="spec" aria-labelledby="spec-cap">
  <div class="spec-doc">
    <div class="spec-top"><span>Certificate of liability insurance</span><span class="spec-tag">Specimen</span></div>
    <dl class="spec-meta"><div><dt>Insured</dt><dd>Sample Electric Co.</dd></div><div><dt>Project</dt><dd>Sample mid-rise, 2026 to 2027</dd></div></dl>
    <div class="spec-scroll" tabindex="0" role="region" aria-label="Specimen certificate checked against project requirements"><table>
      <thead><tr><th scope="col">Coverage</th><th scope="col">Project requires</th><th scope="col">Certificate shows</th><th scope="col">Check</th></tr></thead>
      <tbody>${SPECIMEN.map(([c, r, o, g]) => `<tr${g ? ' class="gap"' : ''}><th scope="row">${esc(c)}</th><td>${esc(r)}</td><td>${esc(o)}</td><td>${g ? `<span class="flag">${esc(g)}</span>` : '<span class="meets">Meets</span>'}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="spec-foot"><span class="spec-score">${fails} of ${SPECIMEN.length} checks fail</span><span>The certificate says covered. The policy doesn't.</span></div>
  </div>
  <figcaption id="spec-cap">Specimen. Sample data, not a real contractor. This is the gap COI Journal covers.</figcaption>
</figure>`;
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
  readDir('articles', ['title', 'description', 'dek', 'date', 'section', 'byline', 'takeaways', 'sources'])
    .map((a) => ({ ...a, url: `/articles/${a.slug}/`, updated: a.updated || a.date }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
const pages = () => readDir('pages', ['title', 'description', 'dek', 'url']);

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
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%231F201C'/%3E%3Ctext x='16' y='23' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='19' fill='%23F7F4EE'%3EJ%3C/text%3E%3Crect x='6' y='26' width='20' height='2' fill='%23FB612A'/%3E%3C/svg%3E";

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
:root{--paper:#F7F4EE;--card:#FFFDF9;--ink:#1F201C;--ink2:#4A4843;--mute:#67635B;--rule:#D9D3C7;--rule2:#BDB5A6;--f:#FB612A;--fdk:#B4461A;--serif:'Roboto Serif',Georgia,'Times New Roman',serif;--sans:'Inter',Arial,sans-serif;--mono:'JetBrains Mono',ui-monospace,Menlo,monospace}
html{scroll-behavior:smooth}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--f);outline-offset:2px}
.skip{position:absolute;left:-9999px}.skip:focus{left:16px;top:8px;z-index:10;background:var(--card);padding:8px 12px}
.wrap{max-width:1160px;margin:0 auto;padding:0 32px}
.col{max-width:700px;margin:0 auto}
.eyebrow{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--fdk)}
/* Top strip: the ownership line, on every page */
.strip{background:var(--ink);color:#E9E4DA;font-size:12.5px}
.strip .wrap{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:36px}
.strip a{text-decoration:none;color:#fff}
.strip a:hover{text-decoration:underline}
.pub{display:inline-flex;align-items:center;gap:8px}
.fmark{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:3px;background:var(--f);color:#fff;font:700 11px/1 var(--sans)}
/* Masthead */
.mast{padding:28px 0 0;text-align:center}
.mast .name{display:inline-block;font-family:var(--serif);font-variation-settings:'opsz' 144;font-weight:600;font-size:clamp(46px,8.4vw,92px);line-height:1;letter-spacing:-.025em;text-decoration:none}
.mast .tag{font-family:var(--serif);font-style:italic;font-size:16px;color:var(--ink2);margin-top:10px}
.mast.small{padding:18px 0 0}
.mast.small .name{font-size:clamp(34px,5vw,48px)}
.mast.small .tag{display:none}
.dateline{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:20px;padding:8px 0;border-top:3px double var(--ink);border-bottom:1px solid var(--ink);font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)}
.secnav{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 28px;padding:10px 0;border-bottom:1px solid var(--rule)}
.secnav a{font-size:14px;font-weight:500;text-decoration:none;color:var(--ink2);line-height:28px}
.secnav a:hover,.secnav a[aria-current]{color:var(--ink);text-decoration:underline;text-decoration-color:var(--f);text-underline-offset:5px}
/* Front page */
.front{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:0;margin-top:32px}
.front>*+*{border-left:1px solid var(--rule);padding-left:32px}
.front>:first-child{padding-right:32px}
.lead h2{font-family:var(--serif);font-variation-settings:'opsz' 72;font-weight:400;font-size:clamp(32px,4.2vw,50px);line-height:1.08;letter-spacing:-.02em;margin-top:10px;text-wrap:balance}
.lead h2 a{text-decoration:none}
.lead h2 a:hover{text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:var(--f);text-underline-offset:6px}
.lead .dek{font-family:var(--serif);font-size:20px;line-height:1.5;color:var(--ink2);margin-top:14px;max-width:620px}
.by{font-size:13px;color:var(--mute);margin-top:14px}
.lead ul{margin-top:22px;padding-top:18px;border-top:1px solid var(--rule);list-style:none}
.lead li{position:relative;padding-left:18px;font-size:15.5px;line-height:1.55;margin-top:10px;color:var(--ink2)}
.lead li::before{content:'';position:absolute;left:0;top:.62em;width:8px;height:2px;background:var(--f)}
.more{display:inline-block;margin-top:20px;font-weight:600;font-size:15px;text-decoration:underline;text-decoration-color:var(--f);text-underline-offset:4px}
.block{margin-top:56px;padding-top:14px;border-top:2px solid var(--ink)}
.block>.eyebrow{display:block}
.block>h2{font-family:var(--serif);font-weight:400;font-size:30px;line-height:1.2;letter-spacing:-.015em;margin-top:6px}
.block>p{color:var(--ink2);margin-top:8px;max-width:68ch}
.panel{margin-top:56px;background:var(--ink);color:#E9E4DA;border-radius:4px;padding:36px 36px 28px}
.panel .eyebrow{color:#F59A6C}
.panel h2{font-family:var(--serif);font-weight:400;font-size:clamp(26px,3vw,36px);line-height:1.15;letter-spacing:-.015em;color:#fff;margin-top:8px;max-width:22ch}
.panel>p{font-size:15px;color:#C9C3B8;margin-top:10px;max-width:62ch}
.panel>p a{color:#fff;text-decoration-color:var(--f)}
.nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:26px}
.num{display:flex;flex-direction:column;gap:8px;padding:18px 20px;background:#2A2B26;border:1px solid #3A3B35;border-left:3px solid var(--f);border-radius:4px}
.num .k{font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#F59A6C}
.num h3{font-family:var(--serif);font-weight:600;font-size:24px;line-height:1.15;color:#fff}
.num p{font-size:14.5px;color:#D6D0C5}
.num .src{margin-top:auto;padding-top:10px;border-top:1px solid #3A3B35;font-size:13px;color:#B5AFA4}
.num .src b{display:block;font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#ADA79C;margin-bottom:2px}
.chip{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;padding:3px 9px;border:1px solid #4A4B45;border-radius:4px;font-family:var(--mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#E9E4DA}
.chip::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--f)}
.gapline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:28px}
.gapline span{display:flex;flex-direction:column;align-items:center;gap:8px}
.gapline i{display:block;width:100%;height:2px;background:var(--f)}
.gapline b{font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#B5AFA4}
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
.spec thead th{font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.spec tbody th{font-weight:600}
.spec tr.gap td:nth-child(3){color:var(--fdk)}
.flag{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--fdk);white-space:nowrap}
.flag::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--f);flex:none}
.meets{display:inline-flex;align-items:center;gap:6px;color:#2D7A4C;font-weight:600}
.meets::before{content:'';width:7px;height:7px;border-radius:50%;background:#2D7A4C}
.spec-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin-top:14px;font-family:var(--serif);font-style:italic;font-size:15px;color:var(--ink2)}
.spec-score{font-family:var(--mono);font-style:normal;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;background:var(--fdk);color:#fff;border-radius:3px}
.spec figcaption{font-size:12.5px;color:var(--mute);margin-top:8px}
.sec{border-top:2px solid var(--f)}
.secs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0 16px;margin-top:22px}
.sec{padding:14px 0 4px}
.sec h3{font-family:var(--serif);font-weight:600;font-size:18px;line-height:1.25}
.sec p{font-size:14px;color:var(--ink2);margin-top:8px}
.lib{columns:2;column-gap:48px;margin-top:18px;list-style:none}
.lib li{break-inside:avoid;padding:12px 0;border-bottom:1px solid var(--rule)}
.lib a{font-family:var(--serif);font-size:18px;line-height:1.35;text-decoration:none}
.lib a:hover{text-decoration:underline;text-decoration-color:var(--f);text-underline-offset:4px}
.lib span{display:block;font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-top:4px}
/* Signup and forms */
.sub h2{font-family:var(--serif);font-weight:600;font-size:26px;line-height:1.15;margin-top:8px}
.sub>p{font-size:15px;color:var(--ink2);margin-top:8px}
.sub form,.gap form{display:grid;gap:10px;margin-top:16px}
label{font-size:13px;font-weight:500;color:var(--ink2)}
input[type=email],input[type=text],select,textarea{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--rule2);border-radius:6px;background:var(--card);font:inherit;font-size:15px;color:var(--ink)}
textarea{min-height:140px;resize:vertical}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border:1px solid var(--ink);border-radius:6px;background:var(--ink);color:#fff;font:inherit;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer}
.btn:hover{background:#000}
.btn.o{background:transparent;color:var(--ink)}
.btn.o:hover{background:var(--card)}
.btn.f{background:var(--f);border-color:var(--f)}
.btn.f:hover{background:#D54E21;border-color:#D54E21}
.hp{display:none}
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
.house{margin-top:64px;background:var(--ink);color:#E9E4DA;border-top:3px solid var(--f)}
.house .wrap{display:grid;grid-template-columns:1.4fr 1fr;gap:32px;align-items:center;padding-top:40px;padding-bottom:40px}
.house .eyebrow{color:#F59A6C}
.house h2{font-family:var(--serif);font-weight:400;font-size:clamp(24px,2.8vw,32px);line-height:1.2;color:#fff;margin-top:8px}
.house p{font-size:15px;margin-top:10px;max-width:58ch}
.house .btns{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end}
.house .btn.o{color:#fff;border-color:rgba(255,255,255,.4)}
.house .btn.o:hover{background:rgba(255,255,255,.08)}
/* Article and page */
.art{padding:44px 0 8px}
.art h1{font-family:var(--serif);font-variation-settings:'opsz' 72;font-weight:400;font-size:clamp(34px,5vw,54px);line-height:1.08;letter-spacing:-.02em;margin-top:10px;text-wrap:balance}
.art .dek{font-family:var(--serif);font-size:20px;line-height:1.5;color:var(--ink2);margin-top:14px}
.art .by{padding-bottom:18px;border-bottom:1px solid var(--rule)}
.tldr{margin-top:28px;padding:18px 20px;background:var(--card);border:1px solid var(--rule);border-left:3px solid var(--f)}
.tldr h2{font-family:var(--mono);font-size:11.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--fdk)}
.tldr ul{margin-top:8px;padding-left:18px}
.tldr li{font-size:15.5px;margin-top:6px}
.prose{font-family:var(--serif);font-size:19px;line-height:1.7;margin-top:28px}
.prose>*+*{margin-top:20px}
.prose h2{font-family:var(--serif);font-weight:600;font-size:26px;line-height:1.25;margin-top:40px}
.prose h3{font-family:var(--sans);font-size:17px;font-weight:600;margin-top:28px}
.prose ul,.prose ol{padding-left:24px}
.prose li+li{margin-top:8px}
.prose a{text-decoration:underline;text-decoration-color:var(--f);text-decoration-thickness:1px;text-underline-offset:3px}
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
.fgrid h2{font-family:var(--mono);font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin-bottom:8px}
.fgrid nav a{display:block;font-size:14px;line-height:30px;text-decoration:none;color:var(--ink2)}
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
  .nums,.gapline{grid-template-columns:1fr}
  .gapline{gap:12px}
  .panel{padding:26px 18px 22px;margin-left:-16px;margin-right:-16px;border-radius:0}
  .lib{columns:1}
  .house .wrap{grid-template-columns:1fr}
  .house .btns{justify-content:flex-start}
  .fgrid{grid-template-columns:1fr;gap:24px}
  .strip .tuesday{display:none}
  .dateline span:nth-child(2){display:none}
  .secnav{justify-content:flex-start;gap:0 18px}
  .prose{font-size:18px}
}
@media(max-width:520px){.secs{grid-template-columns:1fr}}
@media print{.strip,.secnav,.house,footer,.sub,form{display:none}}
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
  <a class="tuesday" href="/digest/">The COI Digest, every Tuesday</a>
</div></div>`;
}

const NAV = [
  ['/', 'Front page'],
  ['/articles/why-coi-journal/', 'From the editors'],
  ['/methodology/', 'Gap Index'],
  ['/gap-of-the-month/', 'Gap of the Month'],
  ['/digest/', 'The COI Digest'],
  ['/about/', 'About'],
];

function masthead(current, small) {
  return `<header class="wrap">
  <div class="mast${small ? ' small' : ''}">
    <a class="name" href="/"${current === '/' ? ' aria-current="page"' : ''}>COI Journal</a>
    <p class="tag">Construction insurance compliance, reported.</p>
  </div>
  <div class="dateline"><span>Contractor COIs · Endorsements · Project requirements</span><span>Est. 2026</span><span>${LAUNCH}</span></div>
  <nav class="secnav" aria-label="Sections">${NAV.map(([h, t]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
</header>`;
}

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
    <div><h2>Read</h2><nav aria-label="Footer, read"><a href="/">Front page</a><a href="/methodology/">The COI Gap Index</a><a href="/digest/">The COI Digest</a><a href="/feed.xml">RSS feed</a></nav></div>
    <div><h2>The Journal</h2><nav aria-label="Footer, the Journal"><a href="/about/">About</a><a href="/principles/">Publishing principles</a><a href="/gap-of-the-month/">Gap of the Month</a><a href="mailto:${CONTACT}">Contact</a></nav></div>
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
  <p>The week's construction insurance compliance news, one explainer and one gap worth knowing. Tuesday mornings, five minutes.</p>
  <form novalidate>
    <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true"/>
    <label for="${id}-email">Work email</label>
    <input id="${id}-email" type="email" name="email" autocomplete="email" required/>
    <label for="${id}-role">I work as a</label>
    <select id="${id}-role" name="role"><option value="">Choose one (optional)</option>${ROLES.map((r) => `<option>${r}</option>`).join('')}</select>
    <button class="btn" type="submit">Subscribe</button>
    <p class="err" role="alert" hidden></p>
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
    <input id="gap-email" type="email" name="email" autocomplete="email" required/>
    <label for="gap-role">I work as a</label>
    <select id="gap-role" name="role"><option value="">Choose one (optional)</option>${ROLES.map((r) => `<option>${r}</option>`).join('')}</select>
    <label for="gap-story">What happened? No names, policy numbers or documents, please.</label>
    <textarea id="gap-story" name="story" required></textarea>
    <label class="check"><input type="checkbox" name="consent" required/> <span>COI Journal may use my story, with identifying details removed. I'll be credited only if I ask.</span></label>
    <button class="btn" type="submit">Send my story</button>
    <p class="err" role="alert" hidden></p>
    <p class="fine" data-legal>By submitting, you agree to Forsured's ${LEGAL}.</p>
  </form>
  <p class="ok" role="status" hidden>Thanks. If we pick your story, we'll write back before anything runs.</p>
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
      if (!RE.test(email)) { fail('Please enter a valid email.'); form.email.focus(); return; }
      if (form.story && !form.story.value.trim()) { fail('Tell us what happened.'); form.story.focus(); return; }
      if (form.consent && !form.consent.checked) { fail('Please tick the box so we can use your story.'); return; }
      if (form.botcheck.checked) return;
      err.hidden = true; btn.disabled = true; btn.textContent = 'Sending…';
      const kind = box.dataset.form;
      const subject = kind === 'gap' ? 'COI Journal: Gap of the Month submission' : 'COI Digest subscriber';
      const data = { email, role: form.role.value, story: form.story ? form.story.value.trim() : '', form_source: kind === 'gap' ? 'COI Journal Gap' : 'COI Journal', lead_source: 'COI Journal', placement: box.dataset.placement, page: location.pathname, submitted_at: new Date().toISOString() };
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

function frontPage(arts) {
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
      <span class="eyebrow">${esc(lead.section)}</span>
      <h2><a href="${lead.url}">${esc(lead.title)}</a></h2>
      <p class="dek">${esc(lead.dek)}</p>
      <p class="by">By ${esc(lead.byline)} · <time datetime="${lead.date}">${human(lead.date)}</time></p>
      ${specimen()}
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
    </aside>
  </div>

  <section class="panel" aria-labelledby="nums-h">
    <span class="eyebrow">The COI Gap Index · First edition 2027</span>
    <h2 id="nums-h">Three numbers nobody in construction publishes. We're building them.</h2>
    <p>Each one runs only when its sample clears our <a href="/methodology/">rules</a>, with the sample size printed next to it.</p>
    <div class="nums">${NUMBERS.map(([k, d, src], i) => `<div class="num"><div class="k">Headline number ${i + 1}</div><h3>${k}</h3><p>${d}</p><span class="chip">Not yet published</span><div class="src"><b>Built from</b>${src}</div></div>`).join('')}</div>
    ${gapline(['Collect the data', 'Clear the sample rules', 'Publish with sample size'])}
  </section>

  <section class="block" aria-labelledby="secs-h">
    <span class="eyebrow">What we publish</span>
    <h2 id="secs-h">Five desks, one beat</h2>
    <div class="secs">${SECTIONS.map(([t, d]) => `<div class="sec"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
  </section>

  <section class="block" aria-labelledby="lib-h">
    <span class="eyebrow">COI 101 · From our publisher's library</span>
    <h2 id="lib-h">Start with the basics</h2>
    <p>Plain-English explainers on the terms that decide who pays. They live on forsured.ai, our publisher's site.</p>
    <ul class="lib">${LIBRARY.map(([p, t]) => `<li><a href="${fsLink(p, 'library')}">${esc(t)}</a><span>forsured.ai</span></li>`).join('')}</ul>
  </section>
</main>
${HOUSE('front')}
${FOOTER(y)}
${close(y, true)}`;
}

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
      author: { '@type': 'Organization', name: `COI Journal (${a.byline})`, url: `${SITE}/about/` },
      publisher: { '@id': PUBLISHER['@id'] },
      mainEntityOfPage: `${SITE}${a.url}`,
      articleSection: a.section,
      isAccessibleForFree: true,
      inLanguage: 'en-US',
      isPartOf: { '@id': WEBSITE['@id'] },
    },
    PUBLISHER,
    WEBSITE,
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'COI Journal', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: a.title, item: `${SITE}${a.url}` }] },
  ];
  return `${head({ title: `${a.title} | COI Journal`, description: a.description, url: a.url, type: 'article', jsonld: graph, published: a.date, modified: a.updated, md: true })}
${masthead(a.url, true)}
<main id="main" class="wrap">
  <article class="col art">
    <span class="eyebrow">${esc(a.section)}</span>
    <h1>${esc(a.title)}</h1>
    <p class="dek">${esc(a.dek)}</p>
    <p class="by">By ${esc(a.byline)} · <time datetime="${a.date}">${human(a.date)}</time>${a.updated !== a.date ? ` · Updated <time datetime="${a.updated}">${human(a.updated)}</time>` : ''}</p>
    <section class="tldr" aria-labelledby="tldr-h"><h2 id="tldr-h">The short version</h2><ul>${a.takeaways.map((t) => `<li>${inline(t)}</li>`).join('')}</ul></section>
    <div class="prose">
${markdown(a.body)}
    </div>
${a.sources.length ? `    <section class="sources" aria-labelledby="src-h"><h2 id="src-h">Sources</h2><ol>${a.sources.map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a>${s.publisher ? `, ${esc(s.publisher)}` : ''}${s.date ? `, ${esc(s.date)}` : ''}</li>`).join('')}</ol></section>\n` : ''}    <p class="disclose" data-disclosure>COI Journal is published by Forsured, which sells construction insurance compliance software. <a href="/principles/">How we keep editorial separate</a>.</p>
    <div class="boxed">${signup('sub-art', 'article')}</div>
  </article>
</main>
${HOUSE('article')}
${FOOTER(y)}
${close(y, true)}`;
}

function staticPage(p, y) {
  const forms = p.signup || p.gapForm;
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
${p.gapForm ? `    ${gapForm()}\n` : ''}  </article>
</main>
${HOUSE(p.slug)}
${FOOTER(y)}
${close(y, forms)}`;
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

function sitemap(arts, pgs) {
  const urls = [['/', arts[0].updated], ...arts.map((a) => [a.url, a.updated]), ...pgs.map((p) => [p.url, p.updated || arts[0].updated])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d.slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}

const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;

function llms(arts, pgs) {
  return `# COI Journal\n\n> A publication about construction insurance compliance: contractor certificates of insurance (COIs), endorsements, project requirements and who pays when coverage fails. Published by Forsured (${FORSURED}), a construction insurance compliance software company. COI Journal does not rank or review software vendors.\n\n## Articles\n\n${arts.map((a) => `- [${a.title}](${SITE}${a.url}index.md): ${a.description}`).join('\n')}\n\n## About the publication\n\n${pgs.map((p) => `- [${p.title}](${SITE}${p.url}): ${p.description}`).join('\n')}\n\n## Reference explainers (on the publisher's site)\n\n${LIBRARY.map(([p, t]) => `- [${t}](${FORSURED}${p})`).join('\n')}\n`;
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
<tr><td style="padding:28px 32px 12px;border-bottom:3px double #1F201C;text-align:center">
<div style="font:600 34px/1 Georgia,'Times New Roman',serif;color:#1F201C;letter-spacing:-.5px">The COI Digest</div>
<div style="font:12px/1.4 Arial,sans-serif;color:#76726A;margin-top:8px;text-transform:uppercase;letter-spacing:1px">From COI Journal · Published by Forsured</div>
</td></tr>
<tr><td style="padding:28px 32px 8px">
${p('Thanks for subscribing.')}
${p('The COI Digest goes out Tuesday mornings: the week\'s construction insurance compliance news, one explainer and one gap worth knowing. Five minutes to read.')}
${p(`While you wait for the first issue, three good places to start:`)}
<ul style="margin:0 0 16px;padding-left:20px;font:16px/1.6 Georgia,'Times New Roman',serif;color:#1F201C">
<li>${a(ut(`${FORSURED}/blog/compliance-isnt-coverage/`), "A COI on file isn't proof of coverage")}</li>
<li>${a(ut(`${FORSURED}/blog/how-to-check-a-contractor-coi/`), 'How to check a contractor COI against your project requirements')}</li>
<li>${a(ut(`${FORSURED}/blog/completed-operations-additional-insured/`), 'Does additional insured status cover you after the job is done?')}</li>
</ul>
${p(`Had a coverage gap catch you out? ${a(ut(`${SITE}/gap-of-the-month/`), 'Tell us about it')}. We pick one each month.`)}
</td></tr>
<tr><td style="padding:8px 32px 28px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#FB612A" style="border-radius:6px"><a href="${ut(`${FORSURED}/`)}#demo" style="display:inline-block;padding:12px 18px;font:600 15px/1 Arial,sans-serif;color:#ffffff;text-decoration:none">Get a free COI risk check from Forsured</a></td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #D9D3C7;font:12px/1.6 Arial,sans-serif;color:#76726A">
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
  if (!arts.length) throw new Error('need at least one article');
  const y = year(arts[0].updated);
  const files = {
    'index.html': frontPage(arts),
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
