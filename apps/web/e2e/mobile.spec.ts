import { expect, test, type Page } from '@playwright/test';
async function enter(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть демо' }).click();
  await expect(page.getByRole('button', { name: 'Открыть кошелёк и историю' })).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
async function assertCompactGeometry(page: Page) {
  const geometry = await page.evaluate(() => {
    const wallet = document.querySelector<HTMLElement>('.wallet-stack')!.getBoundingClientRect();
    const stage = document
      .querySelector<HTMLElement>('[data-testid="wallet-stage"]')!
      .getBoundingClientRect();
    const assistant = document
      .querySelector<HTMLElement>('[data-testid="assistant-capsule"]')!
      .getBoundingClientRect();
    const clasp = document.querySelector<HTMLElement>('.clasp')!.getBoundingClientRect();
    const nav = document.querySelector<HTMLElement>('.bottom-nav')!.getBoundingClientRect();
    return {
      wallet: { width: wallet.width, height: wallet.height },
      flowGap: assistant.top - stage.bottom,
      clasp: { width: clasp.width, right: clasp.right },
      nav: { height: nav.height, top: nav.top, bottom: nav.bottom },
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      documentBottom: document.documentElement.scrollHeight,
    };
  });
  expect(geometry.wallet.width / geometry.wallet.height).toBeGreaterThan(0.85);
  expect(geometry.wallet.width / geometry.wallet.height).toBeLessThan(1.3);
  expect(geometry.clasp.width).toBeGreaterThanOrEqual(44);
  expect(geometry.clasp.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.flowGap).toBeGreaterThanOrEqual(0);
  expect(geometry.nav.height).toBeLessThanOrEqual(72);
  expect(geometry.nav.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.documentBottom).toBeGreaterThan(geometry.nav.top);
}

async function assertExpandedGeometry(page: Page) {
  const geometry = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-testid="money-header"]')!;
    const amount = header.querySelector('h1')!;
    const fan = document.querySelector<HTMLElement>('[data-testid="expanded-fan"]')!;
    const clasp = document.querySelector<HTMLElement>('.fan-clasp')!;
    const style = getComputedStyle(amount);
    const parse = (value: string) =>
      value
        .match(/[\d.]+/g)
        ?.map(Number)
        .slice(0, 3) ?? [];
    const [r = 0, g = 0, b = 0] = parse(style.color);
    const luminance = (channel: number) => {
      const normalized = channel / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const textLuminance = 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);
    const pageBackground = getComputedStyle(document.documentElement)
      .getPropertyValue('--page-bg')
      .trim();
    return {
      amountBottom: amount.getBoundingClientRect().bottom,
      fanTop: fan.getBoundingClientRect().top,
      claspRight: clasp.getBoundingClientRect().right,
      viewportWidth: innerWidth,
      textLuminance,
      pageBackground,
      theme: document.documentElement.dataset.theme,
      visible: style.visibility === 'visible' && style.opacity === '1',
    };
  });
  expect(geometry.fanTop).toBeGreaterThanOrEqual(geometry.amountBottom);
  expect(geometry.claspRight).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.pageBackground).not.toBe('');
  expect(geometry.visible).toBe(true);
  expect(geometry.textLuminance).toBeGreaterThanOrEqual(0);
}
test('liquid wallet, mode, comfort and advice lifecycle persist', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await enter(page);
  await expect(page.getByText(/Безопасно сегодня/)).toBeVisible();
  await assertCompactGeometry(page);
  await page.getByRole('button', { name: 'Открыть кошелёк и историю' }).click();
  await expect(page.getByRole('dialog', { name: 'Деньги' })).toBeVisible();
  await assertExpandedGeometry(page);
  await page.getByRole('tab', { name: 'График' }).click();
  await expect(page.locator('.chart-curve')).toHaveAttribute('d', /^M .+ C /);
  await page.getByRole('button', { name: 'Закрыть кошелёк' }).click();
  await expect(page.getByRole('button', { name: 'Открыть кошелёк и историю' })).toBeFocused();
  await page.getByRole('button', { name: /Режим base/i }).click();
  await page.getByRole('button', { name: /Hard/ }).click();
  await page.getByRole('link', { name: /План/ }).click();
  await expect(page.getByText(/Hard · интенсивно/)).toBeVisible();
  await page.getByRole('button', { name: 'Высокий' }).click();
  await page.getByRole('link', { name: /Профиль/ }).click();
  await page.getByLabel('Мягкий лимит в месяц').fill('10000');
  await page.getByRole('link', { name: /Помощник/ }).click();
  await page.getByRole('button', { name: 'Не предлагать снова' }).first().click();
  await page.getByRole('button', { name: 'Архив' }).click();
  await expect(page.getByRole('button', { name: /Вернуть/ })).toBeVisible();
  await page.getByRole('button', { name: /Вернуть/ }).click();
  await page.reload();
  await expect(page.getByText('Архив пуст')).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('wallet supports browser back, tabs, keyboard close and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  const trigger = page.getByRole('button', { name: 'Открыть кошелёк и историю' });
  await trigger.click();
  await page.getByRole('tab', { name: 'История' }).click();
  await expect(page.locator('.transactions-preview')).toBeVisible();
  await page.goBack();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await noOverflow(page);
});

test('persisted dark theme stays coherent between overview and Money', async ({ page }) => {
  await enter(page);
  await page.getByRole('link', { name: /Профиль/ }).click();
  await page.getByRole('button', { name: 'Тёмная' }).click();
  await page.getByRole('link', { name: /Сегодня/ }).click();
  const compactTheme = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    page: getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim(),
    text: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
  }));
  await page.getByRole('button', { name: 'Открыть кошелёк и историю' }).click();
  const expandedTheme = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    page: getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim(),
    text: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
  }));
  expect(compactTheme.theme).toBe('dark');
  expect(expandedTheme).toEqual(compactTheme);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Деньги' })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
});
for (const [width, height] of [
  [320, 568],
  [390, 664],
  [393, 672],
  [430, 740],
  [390, 844],
  [393, 852],
])
  test(`responsive ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await enter(page);
    await assertCompactGeometry(page);
    await page.getByRole('button', { name: 'Открыть кошелёк и историю' }).click();
    await expect(page.getByRole('dialog', { name: 'Деньги' })).toBeVisible();
    await assertExpandedGeometry(page);
    await noOverflow(page);
    await page.getByRole('button', { name: 'Закрыть кошелёк' }).click();
    for (const path of ['/today', '/plan', '/assistant', '/profile']) {
      await page.goto(path);
      await noOverflow(page);
    }
  });
