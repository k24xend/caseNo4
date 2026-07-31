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

async function capture() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  // iPhone-like viewport (wallet QA)
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await enterDemo(page);

  for (const p of pages) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const file = path.join(OUT, `${p.name}-390.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log('saved', file);
  }

  // Wallet expanded (Money)
  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const openBtn = page.getByRole('button', { name: /Открыть кошелёк/i });
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
    await page.getByRole('dialog', { name: /Деньги/i }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(900);
    const moneyFile = path.join(OUT, 'money-expanded-390.png');
    await page.screenshot({ path: moneyFile, fullPage: false });
    console.log('saved', moneyFile);
  }

  // Desktop wide shot of overview
  await context.close();
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dpage = await desk.newPage();
  await enterDemo(dpage);
  await dpage.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
  await dpage.waitForTimeout(800);
  const deskFile = path.join(OUT, 'overview-desktop-1440.png');
  await dpage.screenshot({ path: deskFile, fullPage: true });
  console.log('saved', deskFile);

  await desk.close();
  await browser.close();
  console.log('done →', OUT);
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
