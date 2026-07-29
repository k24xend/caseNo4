import type { Currency } from './models';
export function parseMoney(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(value) ? value : null;
}
export function formatMoney(value: number, currency: Currency, locale = 'ru-RU'): string {
  if (!Number.isSafeInteger(value)) throw new Error('Money must be integer minor units');
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
export const moneyInput = (minor: number) =>
  `${Math.trunc(minor / 100)}${minor % 100 ? `,${String(Math.abs(minor % 100)).padStart(2, '0')}` : ''}`;
export const stableKey = (scope: string, id: string) => `${scope}-${id}`;
export const newId = () => crypto.randomUUID();
