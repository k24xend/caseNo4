import 'package:flutter_test/flutter_test.dart';
import 'package:vyhod/features/onboarding/onboarding_models.dart';

void main() {
  test('money parser returns integer minor units', () {
    expect(parseMoney('1 234,56'), 123456);
    expect(parseMoney('-1'), isNull);
    expect(parseMoney('not money'), isNull);
  });

  test('onboarding preserves separate scheduled entities', () {
    final draft = OnboardingDraft()
      ..incomes.add(IncomeDraft(name: 'A', amount: 100, date: DateTime(2026, 2, 28)))
      ..incomes.add(IncomeDraft(name: 'B', amount: 200, date: DateTime(2026, 3, 1)))
      ..expenses.add(ExpenseDraft(name: 'Rent', amount: 50, date: DateTime(2026, 2, 28)))
      ..debts.add(DebtDraft(name: 'Card', balance: 500, rateBps: 1000, minimum: 20, nextPayment: DateTime(2026, 3, 15)));
    final payload = draft.payload();
    expect(payload['incomes'], hasLength(2));
    expect(payload['expenses'], hasLength(1));
    expect(payload['debts'], hasLength(1));
  });

  test('money validation rejects extra precision, zero and excessive values', () {
    expect(parseMoney('1.001'), isNull);
    expect(parseMoney('0'), isNull);
    expect(parseMoney('1000000001'), isNull);
    expect(parseMoney('12.5'), 1250);
  });

  test('draft restores stable idempotency key and editable entities', () {
    final original = OnboardingDraft(idempotencyKey: 'stable-key')
      ..step = 4
      ..incomes.add(IncomeDraft(name: 'Salary', amount: 100, date: DateTime(2027, 1, 1), recurring: true));
    final restored = OnboardingDraft.fromJson(original.toJson());
    expect(restored.idempotencyKey, 'stable-key');
    expect(restored.step, 4);
    expect(restored.incomes.single.recurring, isTrue);
  });
}
