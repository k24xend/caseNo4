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
      ..incomes.add(IncomeDraft(amount: 100, date: DateTime(2026, 2, 28)))
      ..incomes.add(IncomeDraft(amount: 200, date: DateTime(2026, 3, 1)))
      ..expenses.add(ExpenseDraft(amount: 50, date: DateTime(2026, 2, 28)))
      ..debts.add(DebtDraft(balance: 500, minimum: 20));
    final payload = draft.payload();
    expect(payload['incomes'], hasLength(2));
    expect(payload['expenses'], hasLength(1));
    expect(payload['debts'], hasLength(1));
  });
}
