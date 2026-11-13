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

## Wiring

- Forms post to Web3Forms (emails the team). Set `MAKE_WEBHOOK` in tools/build.js once the Make scenario
  "COI Journal: Digest signups" exists; it adds people to the Attio list `coi_digest_subscribers` and sends
  `email/welcome.html`.
- `CONTACT` in tools/build.js is the reader-facing address.
- `node tools/og.js` re-renders `assets/og.png` and `assets/logo.png`.
