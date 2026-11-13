# COI Journal (coijournal.com)

A publication about construction insurance compliance, published by Forsured. Static site on GitHub Pages,
built from Markdown with the same engine pattern as forsured.ai's blog (zservideo/forsured-site).

## Publish something

```bash
# write content/articles/<slug>.md (JSON front matter, see below) or edit content/pages/*.md
node tools/build.js          # writes the HTML, feed.xml, sitemap.xml, llms.txt, robots.txt
npx playwright test          # must pass before merging
```

Merging to `main` deploys. `tests/site.spec.js` fails if the built files are stale.

Article front matter: `title`, `description` (70 to 170 chars), `dek`, `date` (ISO with offset, never future),
`section`, `byline`, `takeaways` (2 to 4), `sources` (`{title, publisher, date, url}`), optional `updated`, `draft`.

## House rules (enforced by tests)

- "Published by Forsured" in the top strip and footer of every page, and in every email.
- No vendor rankings or reviews, Forsured included. Buyer's guides stay on forsured.ai.
- No Forsured company news. That goes on forsured.ai.
- Every forsured.ai link carries `utm_source=coijournal`; CTAs go to the free COI risk check (`/#demo`).
- Shared Google tag GTM-P6PXX2JM first in `<head>`.
- Forsured Terms and Privacy in every footer and under every form.
- No em dashes.

## AEO checklist (enforced by the build)

`tools/aeo.js` is Warren Brown's AEO checklist (Nov 2026), adapted for the Journal. `node tools/build.js` refuses to
build when any gated report misses, including reports still held by `content/release.json`, so a queued report
can't fail on its release morning. A report is gated when it has a brief or is dated 2026-11-16 or later.

- A brief at `content/reports/briefs/<slug>.json`: 1 to 3 reader questions, 5 to 10 `target_keywords`,
  `competing_sources` (url and title each).
- `answer` in front matter: 40 to 60 words, shown first under the byline.
- H2s phrased as questions (except The short version, Common questions, Sources); sections open on the noun.
- At least one table with a `Table: <caption>` line above it.
- `faq`: 5 to 8 entries, 40 to 80 word answers; the FAQPage JSON-LD is built from the same text.
- 3 to 8 internal and 3 to 8 external body links (forsured.ai and coidigest.com don't count as external),
  descriptive anchor text, no bare URLs or emails.
- Minified JSON-LD, no HTML comments, `dateModified` equal to the visible Updated date.
- Copy rules W1 to W6 (also run on Worth Reading picks) and the not-advice line.
- Not carried over: word and keyword counts, the Forsured paragraph and ranking rules. The byline stays
  "COI Journal News Staff" until the editorial plan is set and the editor approves their name and title.

## Wiring

- Forms post to Web3Forms (emails the team). Set `MAKE_WEBHOOK` in tools/build.js once the Make scenario
  "COI Journal: Digest signups" exists; it adds people to the Attio list `coi_digest_subscribers` and sends
  `email/welcome.html`.
- `CONTACT` in tools/build.js is the reader-facing address.
- `node tools/og.js` re-renders `assets/og.png` and `assets/logo.png`.
