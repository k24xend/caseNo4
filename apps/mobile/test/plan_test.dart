import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vyhod/core/api/models.dart';
import 'package:vyhod/features/plan/plan_module.dart';
import 'package:vyhod/features/today/today_screen.dart';

Map<String, dynamic> planJson({bool withDebts = true}) => {
  'state': 'exit',
  'currency': 'USD',
  'snapshot': {
    'safe_to_spend': 100,
    'safe_daily_amount': 10,
    'projected_balance_before_next_income': 200,
    'monthly_free_cash_flow': 300,
    'minimum_buffer_target': 50,
  },
  'action': {'type': 'pay_target_debt', 'title': 'Pay target', 'amount': 25},
  'debt_forecasts': withDebts ? {
    'avalanche': {
      'strategy': 'avalanche', 'months': 12,
      'debt_free_date': '2027-05-01', 'total_paid': 120000,
      'negative_amortization': <String>[], 'order': ['a'],
    },
    'snowball': {
      'strategy': 'snowball', 'months': 14,
      'debt_free_date': '2027-07-01', 'total_paid': 125000,
      'negative_amortization': ['b'], 'order': ['b'],
    },
  } : <String, dynamic>{},
};

void main() {
  test('deserializes debt forecasts and supports no-debt response', () {
    final plan = FinancialPlan.fromJson(planJson());
    expect(plan.debtForecasts['avalanche']!.months, 12);
    expect(plan.debtForecasts['snowball']!.totalPaid, 125000);
    expect(FinancialPlan.fromJson(planJson(withDebts: false)).debtForecasts, isEmpty);
  });

  testWidgets('renders real avalanche and snowball forecasts', (tester) async {
    final plan = FinancialPlan.fromJson(planJson());
    await tester.pumpWidget(ProviderScope(
      overrides: [planProvider.overrideWith((ref) async => plan)],
      child: const MaterialApp(home: PlanScreen()),
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('Avalanche'), findsOneWidget);
    expect(find.textContaining('Snowball'), findsOneWidget);
    expect(find.textContaining('12 мес.'), findsOneWidget);
    expect(find.textContaining('14 мес.'), findsOneWidget);
  });

  testWidgets('renders explicit no-debt state', (tester) async {
    final plan = FinancialPlan.fromJson(planJson(withDebts: false));
    await tester.pumpWidget(ProviderScope(
      overrides: [planProvider.overrideWith((ref) async => plan)],
      child: const MaterialApp(home: PlanScreen()),
    ));
    await tester.pumpAndSettle();
    expect(find.text('Долгов для прогноза нет.'), findsOneWidget);
  });
}
