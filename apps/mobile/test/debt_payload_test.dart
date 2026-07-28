import 'package:flutter_test/flutter_test.dart';
import 'package:vyhod/features/debts/debts_module.dart';

void main() {
  for (final currency in ['RUB', 'USD', 'EUR']) {
    test('debt payload preserves $currency base currency', () {
      final payload = debtPayload(
        name: 'Debt', debtType: 'credit', balance: 10000,
        currency: currency, annualRateBps: 1000,
        minimumPayment: 1000, dueDay: 15, overdue: false,
        customPriority: 7,
      );
      expect(payload['currency'], currency);
      expect(payload['balance'], 10000);
      expect(payload['custom_priority'], 7);
    });
  }
}
