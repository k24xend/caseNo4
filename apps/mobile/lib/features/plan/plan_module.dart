import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../today/today_screen.dart';

class PlanScreen extends ConsumerWidget {
  const PlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
        appBar: AppBar(title: const Text('План')),
        body: ref.watch(planProvider).when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => Center(
                child: FilledButton(
                  onPressed: () => ref.invalidate(planProvider),
                  child: const Text('Повторить'),
                ),
              ),
              data: (plan) => ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Text(_state(plan.state),
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 12),
                  Text(plan.action.title),
                  const Divider(height: 40),
                  Text(
                      'Свободный денежный поток: ${money(plan.snapshot.monthlyFreeCashFlow, plan.currency)}'),
                  Text(
                      'Защищённый резерв: ${money(plan.snapshot.minimumBuffer, plan.currency)}'),
                  const SizedBox(height: 24),
                  Text('Прогноз погашения долгов',
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  if (plan.debtForecasts.isEmpty)
                    const Text('Долгов для прогноза нет.')
                  else
                    for (final entry in plan.debtForecasts.entries)
                      _ForecastCard(
                        name: _strategy(entry.key),
                        forecast: entry.value,
                        currency: plan.currency,
                      ),
                  if (plan.debtForecasts.isNotEmpty)
                    const Text(
                      'Прогноз ориентировочный и пересчитывается после изменения данных.',
                    ),
                ],
              ),
            ),
      );

  String _state(String state) => const {
        'critical': 'Критическая ситуация',
        'stabilization': 'Стабилизация',
        'exit': 'Выход из долгов',
        'buffer': 'Создание подушки',
        'growth': 'Рост',
      }[state.toLowerCase()] ??
      'Финансовый путь';

  String _strategy(String strategy) => const {
        'avalanche': 'Avalanche — сначала высокая ставка',
        'snowball': 'Snowball — сначала маленький остаток',
        'custom': 'Пользовательский порядок',
      }[strategy] ??
      strategy;
}

class _ForecastCard extends StatelessWidget {
  const _ForecastCard({
    required this.name,
    required this.forecast,
    required this.currency,
  });

  final String name;
  final DebtForecast forecast;
  final String currency;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: Theme.of(context).textTheme.titleMedium),
              Text(forecast.months == null
                  ? 'Не удаётся закрыть в горизонте прогноза'
                  : 'Ориентировочный срок: ${forecast.months} мес.'),
              if (forecast.debtFreeDate != null)
                Text(
                    'Ориентировочная дата: ${forecast.debtFreeDate!.month.toString().padLeft(2, '0')}.${forecast.debtFreeDate!.year}'),
              Text('Общая сумма выплат: '
                  '${money(forecast.totalPaid, currency)}'),
              if (forecast.negativeAmortization.isNotEmpty)
                const Text(
                  'Внимание: платёж не покрывает начисляемые проценты.',
                ),
            ],
          ),
        ),
      );
}
