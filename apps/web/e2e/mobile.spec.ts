import { expect, test, type Page } from '@playwright/test';

async function assertMobile(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
async function addTransaction(page: Page, kind: 'Расход' | 'Доход', description: string) {
  await page.getByRole('button', { name: 'Добавить операцию' }).click();
  await page.getByText(kind, { exact: true }).click();
  await page.getByLabel('Сумма, ₽').fill(kind === 'Расход' ? '1250' : '3000');
  await page.getByLabel('Категория').fill(kind === 'Расход' ? 'Продукты' : 'Подработка');
  await page.getByLabel('Описание').fill(description);
  await page.getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(page.getByText(description)).toBeVisible();
}

test('complete durable mobile demo flow', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть демо' }).click();
  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible();
  await assertMobile(page);

  await page.getByRole('link', { name: /План/ }).click();
  await page.getByRole('link', { name: /Проверить ускорение/ }).click();
  const initialResult = await page.locator('.scenario-result h2').textContent();
  await page.getByLabel('Доп. доход / месяц').fill('30000');
  await expect(page.locator('.scenario-result h2')).not.toHaveText(initialResult ?? '');
  await page.getByRole('button', { name: 'Принять как основной план' }).click();
  await expect(page.getByText(/Активен пользовательский план/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Активен пользовательский план/)).toBeVisible();
  await page.getByRole('link', { name: /План/ }).click();
  await page.getByRole('link', { name: /Долги и стратегия/ }).click();
  await page.getByRole('button', { name: /Добавить долг/ }).click();
  await page.getByLabel('Название').fill('E2E долг');
  await page.getByLabel('Остаток, ₽').fill('24000');
  await page.getByLabel('Ставка, %').fill('12');
  await page.getByLabel('Минимальный платёж, ₽').fill('2000');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('E2E долг')).toBeVisible();
  await page.getByText('E2E долг').click();
  await page.getByLabel('Название').fill('E2E долг изменён');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('E2E долг изменён')).toBeVisible();
  await page.getByRole('button', { name: 'Удалить E2E долг изменён' }).click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByText('E2E долг изменён')).toHaveCount(0);

  await page.getByRole('link', { name: /Операции/ }).click();
  await addTransaction(page, 'Расход', 'E2E покупка');
  await addTransaction(page, 'Доход', 'E2E доход');
  await page.reload();
  await expect(page.getByText('E2E покупка')).toBeVisible();
  await expect(page.getByText('E2E доход')).toBeVisible();
  await assertMobile(page);

  await page.getByRole('link', { name: /Профиль/ }).click();
  await page.getByLabel('Искусственный offline').check();
  await page.getByRole('link', { name: /Операции/ }).click();
  await addTransaction(page, 'Расход', 'E2E offline');
  await expect(page.getByText('Ожидает').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('E2E offline')).toBeVisible();
  await page.getByRole('link', { name: /Профиль/ }).click();
  await page.getByLabel('Искусственный offline').uncheck();
  await page.getByRole('button', { name: 'Синхронизировать' }).click();
  await page.getByRole('link', { name: /Операции/ }).click();
  await expect(page.getByText('E2E offline')).toHaveCount(1);
  await expect(page.getByText('Синхронизировано').first()).toBeVisible();

  await page.getByRole('link', { name: /Профиль/ }).click();
  await page.getByLabel('Сценарий').selectOption('critical');
  await page.getByRole('link', { name: /Сегодня/ }).click();
  await expect(page.getByText(/Кризис · защищаем/).first()).toBeVisible();
  await page.getByRole('link', { name: /Профиль/ }).click();
  await page.getByLabel('Сценарий').selectOption('empty');
  await page.getByText('Тёмная').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'План' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'План' })).toBeVisible();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

for (const width of [375,390,430]) test(`no horizontal overflow at ${width}px`,async({page})=>{await page.setViewportSize({width,height:844});await page.goto('/');await page.getByRole('button',{name:'Открыть демо'}).click();for(const path of ['/today','/plan','/scenarios','/debts','/transactions','/opportunities','/profile']){await page.goto(path);await assertMobile(page)}});
