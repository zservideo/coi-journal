// The rules every COI Journal page has to follow. See tools/build.js for why each one exists.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;

const ROOT = path.resolve(__dirname, '..');
const { PEOPLE, TERMS } = require('../tools/desk');
// Only released reports are built; queued ones (dated after content/release.json) must not be.
const RELEASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'release.json'), 'utf8')).through;
const reportDate = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'reports', f), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]).date.slice(0, 10);
const REPORT_FILES = fs.readdirSync(path.join(ROOT, 'content', 'reports')).filter((f) => f.endsWith('.md'));
const REPORTS = REPORT_FILES.filter((f) => reportDate(f) <= RELEASE).map((f) => f.replace(/\.md$/, ''));
const QUEUED = REPORT_FILES.filter((f) => reportDate(f) > RELEASE).map((f) => f.replace(/\.md$/, ''));
const PAGES = ['/', '/articles/why-coi-journal/', '/about/', '/principles/', '/methodology/', '/digest/', '/gap-of-the-month/', '/masthead/', ...PEOPLE.map((p) => `/people/${p.slug}/`), '/dictionary/', ...TERMS.map((t) => `/dictionary/${t.slug}/`), '/spot-the-gap/', '/worth-reading/', '/digest/issue-0/', '/resources/', '/resources/agents/', '/resources/sources/', '/reports/', ...REPORTS.map((r) => `/reports/${r}/`)];

test('built files match the content (run node tools/build.js)', () => {
  execFileSync('node', ['tools/build.js', '--check'], { cwd: ROOT, stdio: 'pipe' });
});

test('queued reports are not published yet', () => {
  for (const r of QUEUED) expect(fs.existsSync(path.join(ROOT, 'reports', r, 'index.html'))).toBe(false);
});

test('CNAME is coijournal.com', () => {
  expect(fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim()).toBe('coijournal.com');
});

test('the sitemap lists every page', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const p of PAGES) expect(xml).toContain(`<loc>https://coijournal.com${p}</loc>`);
});

for (const url of PAGES) {
  test.describe(url, () => {
    test.beforeEach(async ({ page }) => {
      await page.route(/googletagmanager|fonts\.g|web3forms/, (r) => r.abort());
      await page.goto(url);
    });

    test('says "Published by Forsured" at the top and in the footer', async ({ page }) => {
      await expect(page.locator('.strip [data-disclosure]')).toContainText('Published by');
      await expect(page.locator('.strip [data-disclosure]')).toContainText('Forsured');
      await expect(page.locator('footer [data-disclosure]')).toContainText('Published by Forsured');
    });

    test('has the shared Google tag first in <head>, once', async ({ page }) => {
      const html = fs.readFileSync(path.join(ROOT, url.slice(1), 'index.html'), 'utf8');
      expect(html.match(/GTM-P6PXX2JM"/g)).toHaveLength(1);
      expect(html.indexOf('googletagmanager')).toBeLessThan(html.indexOf('<meta charset'));
    });

    test('has a canonical, a description and one h1 or front-page masthead', async ({ page }) => {
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://coijournal.com${url}`);
      const d = await page.locator('meta[name=description]').getAttribute('content');
      expect(d.length).toBeGreaterThanOrEqual(70);
      expect(d.length).toBeLessThanOrEqual(170);
      expect(await page.locator('h1').count()).toBeLessThanOrEqual(1);
      const t = await page.title();
      expect(t.length).toBeLessThanOrEqual(70);
    });

    test('footer links Forsured Terms and Privacy', async ({ page }) => {
      await expect(page.locator('footer a[href="https://app.forsured.com/terms"]')).toHaveCount(1);
      await expect(page.locator('footer a[href="https://app.forsured.com/privacy"]')).toHaveCount(1);
    });

    test('every form carries the consent line', async ({ page }) => {
      for (const form of await page.locator('form').all()) {
        await expect(form.locator('[data-legal] a[href="https://app.forsured.com/terms"]')).toHaveCount(1);
        await expect(form.locator('[data-legal] a[href="https://app.forsured.com/privacy"]')).toHaveCount(1);
      }
    });

    test('links to forsured.ai carry utm_source=coijournal', async ({ page }) => {
      const hrefs = await page.locator('a[href^="https://forsured.ai"]').evaluateAll((a) => a.map((x) => x.href));
      expect(hrefs.length).toBeGreaterThan(0);
      for (const h of hrefs) expect(h).toContain('utm_source=coijournal');
    });

    test('internal links resolve', async ({ page, request }) => {
      const hrefs = await page.locator('a[href^="/"]').evaluateAll((a) => [...new Set(a.map((x) => x.getAttribute('href').split('#')[0]))]);
      for (const h of hrefs) expect((await request.get(h)).status(), h).toBe(200);
    });

    test('no em dashes in the copy', async ({ page }) => {
      expect(await page.locator('body').innerText()).not.toContain('—');
    });

    test('no sideways scroll on a phone', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    });

    test('passes axe accessibility checks', async ({ page }) => {
      // Every button is ochre with ink text now, so nothing is excluded.
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
    });
  });
}

test('the Digest form checks the email before sending', async ({ page }) => {
  let posted = false;
  await page.route(/web3forms|hook\.us2\.make\.com/, (r) => { posted = true; r.fulfill({ status: 200, body: '{"success":true}', contentType: 'application/json' }); });
  await page.goto('/digest/');
  const box = page.locator('[data-form=digest]');
  await box.locator('button').click();
  await expect(box.locator('.err')).toBeVisible();
  expect(posted).toBe(false);
  await box.locator('input[type=email]').fill('reader@example.com');
  await box.locator('button').click();
  await expect(box.locator('.ok')).toBeVisible();
  expect(posted).toBe(true);
});

test('Gap of the Month needs a story and consent', async ({ page }) => {
  await page.route(/web3forms|hook\.us2\.make\.com/, (r) => r.fulfill({ status: 200, body: '{"success":true}', contentType: 'application/json' }));
  await page.goto('/gap-of-the-month/');
  const box = page.locator('[data-form=gap]');
  await box.locator('input[type=email]').fill('reader@example.com');
  await box.locator('button').click();
  await expect(box.locator('.err')).toContainText('Tell us what happened');
  await box.locator('textarea').fill('A contractor COI showed additional insured, but the endorsement was missing.');
  await box.locator('button').click();
  await expect(box.locator('.err')).toContainText('tick the box');
  await box.locator('input[name=consent]').check();
  await box.locator('button').click();
  await expect(box.locator('.ok')).toBeVisible();
});

test('unknown paths get the 404 page', async ({ request }) => {
  const r = await request.get('/nope/');
  expect(r.status()).toBe(404);
  expect(await r.text()).toContain("That page isn't here.");
});

test('Spot the Gap scores a round', async ({ page }) => {
  await page.goto('/spot-the-gap/');
  const round = page.locator('[data-round]').first();
  const rows = round.locator('tbody tr');
  const n = await rows.count();
  let fails = 0;
  for (let i = 0; i < n; i++) if ((await rows.nth(i).getAttribute('data-fails')) === '1') { fails++; await rows.nth(i).locator('.pick').click(); }
  await round.locator('[data-check]').click();
  await expect(round.locator('.result')).toContainText(`All ${fails} found`);
  await expect(round.locator('details')).toHaveAttribute('open', '');
});

test('no Claim File anywhere, and no empty placeholder numbers', async ({ page }) => {
  for (const url of PAGES) {
    await page.goto(url);
    const text = await page.locator('body').innerText();
    expect(text, url).not.toMatch(/Claim File/i);
    expect(text, url).not.toMatch(/\?%/);
  }
});

test('articles carry a docket number and a person byline', async ({ page }) => {
  await page.goto('/articles/why-coi-journal/');
  await expect(page.locator('.stamp')).toContainText('COIJ-26-0001');
  await expect(page.locator('.byl a[href="/people/zach-servideo/"]')).toHaveCount(1);
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(ld['@graph'].some((n) => n['@type'] === 'Person' && n.name === 'Zach Servideo')).toBe(true);
});

test('dictionary pages carry DefinedTerm markup', async ({ page }) => {
  await page.goto('/dictionary/additional-insured/');
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(ld['@graph'].some((n) => n['@type'] === 'DefinedTerm' && n.termCode.includes('CG 20 10'))).toBe(true);
});

test('reports carry Report markup, a docket, key findings and sources', async ({ page }) => {
  for (const r of REPORTS) {
    await page.goto(`/reports/${r}/`);
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'];
    const rep = ld.find((x) => x['@type'] === 'Report');
    expect(rep.identifier).toMatch(/^COIJ-26-\d{4}$/);
    expect(rep.reportNumber).toMatch(/^R-\d{2}$/);
    expect(rep.citation.length).toBeGreaterThan(0);
    await expect(page.locator('.findings li').first()).toBeVisible();
    await expect(page.locator('.sources li').first()).toBeVisible();
    await expect(page.locator('.toc a').first()).toBeVisible();
  }
});

test('no data desk framing and no Forsured orange outside the F mark', async ({ page }) => {
  for (const url of ['/', '/spot-the-gap/', '/resources/', `/reports/${REPORTS[0]}/`]) {
    await page.goto(url);
    expect((await page.locator('body').innerText()).toLowerCase()).not.toContain('data desk');
    const orange = await page.evaluate(() => {
      const hits = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.classList.contains('fmark')) continue;
        const cs = getComputedStyle(el);
        for (const k of ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor', 'fill', 'stroke']) {
          if (/rgb\(251, 97, 42\)|rgb\(180, 70, 26\)/.test(cs[k]) && cs.display !== 'none') hits.push(el.className || el.tagName);
        }
      }
      return hits;
    });
    expect(orange).toEqual([]);
  }
});
