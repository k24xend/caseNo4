/**
 * Capture key VYHOD screens for visual QA.
 * Usage (from apps/web, after build):
 *   npm run preview -- --host 127.0.0.1 --port 4173
 *   node scripts/capture-screens.mjs
 */
import { chromium, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';

const pages = [
  { name: 'overview-wallet', path: '/today', after: null },
  { name: 'plan', path: '/plan', after: null },
  { name: 'assistant', path: '/assistant', after: null },
  { name: 'profile', path: '/profile', after: null },
];

async function enterDemo(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const demo = page.getByRole('button', { name: /Открыть демо/i });
  if (await demo.isVisible().catch(() => false)) {
    await demo.click();
    await page.getByRole('button', { name: /Открыть кошелёк/i }).waitFor({ timeout: 15000 });
  }
}

async function shot(page, file, fullPage = false) {
  // CI-safe: avoid fullPage hangs on infinite layout
  await page.screenshot({
    path: file,
    fullPage,
    timeout: 15000,
    animations: 'disabled',
  });
  console.log('saved', file);
}

async function capture() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  // iPhone-like viewport (wallet QA)
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  await enterDemo(page);

  for (const p of pages) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await shot(page, path.join(OUT, `${p.name}-390.png`), false);
  }

  // Wallet expanded (Money)
  await page.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const openBtn = page.getByRole('button', { name: /Открыть кошелёк/i });
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
    await page.getByRole('dialog', { name: /Деньги/i }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await shot(page, path.join(OUT, 'money-expanded-390.png'), false);
  }

  await context.close();

  // Desktop wide shot of overview (viewport only — avoids fullPage timeout)
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dpage = await desk.newPage();
  dpage.setDefaultTimeout(20000);
  await enterDemo(dpage);
  await dpage.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' });
  await dpage.waitForTimeout(900);
  await shot(dpage, path.join(OUT, 'overview-desktop-1440.png'), false);

  await desk.close();
  await browser.close();
  console.log('done →', OUT);
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
