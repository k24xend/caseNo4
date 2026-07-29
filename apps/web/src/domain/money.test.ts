import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney, stableKey } from './money';
describe('money', () => {
  it('parses decimal input into integer minor units', () => {
    expect(parseMoney('1 234,56')).toBe(123456);
    expect(parseMoney('1.999')).toBeNull();
    expect(parseMoney('-1')).toBeNull();
  });
  it('formats currency explicitly', () => {
    expect(formatMoney(123456, 'RUB')).toContain('1');
    expect(() => formatMoney(1.2, 'RUB')).toThrow();
  });
  it('keeps idempotency stable', () => expect(stableKey('tx', '42')).toBe(stableKey('tx', '42')));
});
