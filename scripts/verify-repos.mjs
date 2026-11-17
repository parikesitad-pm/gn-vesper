import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const output = await mkdtemp(join(tmpdir(), 'vesper-repositories-'));
const base = process.env.PREVIEW_URL || 'http://localhost:3000';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let updated = false;
  const repo = { id: 1, owner: 'fixture', name: 'project', fullName: 'fixture/project', description: 'Fixture repository for UI verification.', url: 'https://github.com/fixture/project', private: false, defaultBranch: 'main' };
  const pull = () => ({ number: 3, title: updated ? 'Improve notification delivery' : 'Add repository monitoring', url: 'https://github.com/fixture/project/pull/3', state: 'open', author: 'fixture-author', draft: false, updatedAt: updated ? '2026-11-17T12:00:00Z' : '2026-11-17T11:00:00Z', headSha: 'abc', reviewRequested: false });
  await page.route('**/api/github/repository?**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('repo') === 'fixture/missing') return route.fulfill({ status: 404, json: { error: 'Repository not found or access not granted.' } });
    if (url.searchParams.has('pull')) return route.fulfill({ json: { pull: { ...pull(), body: 'Fixture description. Source stays on GitHub.', additions: 12, deletions: 2, changedFiles: 3, reviews: [{ author: 'reviewer', state: 'APPROVED' }], checks: [{ name: 'Tests', status: 'completed', conclusion: 'success', url: 'https://github.com/fixture/project/actions/runs/1' }] } } });
    return route.fulfill({ json: { repo, pulls: [pull()], limit: 50, fetchedAt: new Date().toISOString() } });
  });
  await page.goto(`${base}/vesper`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Keep the work in view.' })).toBeVisible();
  await page.getByLabel('Repository URL', { exact: true }).fill('https://github.com/fixture/project');
  await page.getByRole('button', { name: 'Watch repository', exact: true }).click();
  await expect(page.getByRole('button', { name: /Add repository monitoring/ })).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: /Add repository monitoring/ })).toBeVisible();
  await page.getByRole('button', { name: /Add repository monitoring/ }).click();
  await expect(page.getByRole('dialog')).toContainText('reviewer · approved');
  await expect(page.getByRole('dialog')).toContainText('Tests');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  updated = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: /Improve notification delivery/ })).toBeVisible();
  await page.getByRole('button', { name: /Activity · 1 unread/ }).click();
  await expect(page.locator('.watch-events')).toContainText('PR updated');
  await page.getByRole('button', { name: 'Mark all read', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Activity', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: 'Repositories', exact: true }).click();
  await expect(page.locator('.repo-island-content')).toContainText('fixture/project');
  await page.keyboard.press('Escape');
  await expect(page.locator('.notch')).toHaveAttribute('data-open', 'false');
  await page.getByLabel('Repository URL', { exact: true }).fill('fixture/missing');
  await page.getByRole('button', { name: 'Watch repository', exact: true }).click();
  await expect(page.locator('.watch-alert')).toContainText('Repository not found');
  const audits = [];
  for (const theme of ['dark', 'light', 'neon']) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    audits.push({ page: 'inbox', theme, violations: audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
  }
  const sizes = [];
  for (const width of [360, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    sizes.push({ width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    if (width === 360) await page.screenshot({ path: join(output, 'inbox-mobile.png'), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.screenshot({ path: join(output, 'inbox-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Stop watching', exact: true }).click();
  await page.getByRole('button', { name: 'Pull requests', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'One URL gets you started.' })).toBeVisible();
  await page.goto(`${base}/docs/github`, { waitUntil: 'networkidle' });
  const docsAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  audits.push({ page: 'docs', violations: docsAudit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
  await page.setViewportSize({ width: 360, height: 800 });
  sizes.push({ page: 'docs', width: 360, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  const status = await page.request.get(`${base}/api/github/status`);
  if ((await status.json()).ready === false) {
    const start = await page.request.get(`${base}/api/github/auth/start`);
    expect(start.status()).toBe(503);
  }
  const invalid = await page.request.get(`${base}/api/github/repository?repo=${encodeURIComponent('https://localhost/secrets')}`);
  expect(invalid.status()).toBe(400);
  console.log(JSON.stringify({ output, errors, sizes, audits, fixtures: true }, null, 2));
  if (errors.length || sizes.some(size => size.overflow) || audits.some(audit => audit.violations.length)) process.exitCode = 1;
} finally { await browser.close(); }
