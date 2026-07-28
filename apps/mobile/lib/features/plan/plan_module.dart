import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../today/today_screen.dart';

class PlanScreen extends ConsumerWidget {
  const PlanScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('План')),
    body: ref.watch(planProvider).when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => Center(child: FilledButton(onPressed: () => ref.invalidate(planProvider), child: const Text('Повторить'))),
      data: (plan) => ListView(padding: const EdgeInsets.all(24), children: [
        Text(_state(plan.state), style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 12), Text(plan.action.title),
        const Divider(height: 40),
        Text('Свободный денежный поток: ${money(plan.snapshot.monthlyFreeCashFlow, plan.currency)}'),
        Text('Защищённый резерв: ${money(plan.snapshot.minimumBuffer, plan.currency)}'),
        const SizedBox(height: 24),
        const Text('Сравнение Avalanche, Snowball и пользовательского порядка рассчитывается backend и будет обновлено после изменения долгов.'),
      ]),
    ),
  );
  String _state(String state) => const {'critical':'Критическая ситуация','stabilization':'Стабилизация','exit':'Выход из долгов','buffer':'Создание подушки','growth':'Рост'}[state.toLowerCase()] ?? 'Финансовый путь';
}
