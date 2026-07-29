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
test('liquid wallet, mode, comfort and advice lifecycle persist', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await enter(page);
  await expect(page.getByText(/Безопасно сегодня/)).toBeVisible();
  await page.getByRole('button', { name: 'Открыть кошелёк и историю' }).click();
  await expect(page.getByRole('dialog', { name: 'Деньги' })).toBeVisible();
  await page.getByRole('tab', { name: 'График' }).click();
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
for (const [width, height] of [
  [320, 568],
  [375, 667],
  [390, 844],
  [393, 852],
  [430, 932],
])
  test(`responsive ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await enter(page);
    for (const path of ['/today', '/plan', '/assistant', '/profile']) {
      await page.goto(path);
      await noOverflow(page);
    }
  });
