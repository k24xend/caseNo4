import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';

final planProvider = FutureProvider<FinancialPlan>((ref) => ref.watch(apiClientProvider).plan());
String money(int minor, String currency) { final sign=minor<0?'-':''; final absolute=minor.abs(); return '$sign${absolute~/100},${(absolute%100).toString().padLeft(2,'0')} $currency'; }

class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Сегодня'),actions:[IconButton(tooltip:'Обновить план',onPressed:()=>ref.invalidate(planProvider),icon:const Icon(Icons.refresh))]),
    body: ref.watch(planProvider).when(
      data:(plan)=>RefreshIndicator(onRefresh:()=>ref.refresh(planProvider.future),child:ListView(padding:const EdgeInsets.all(24),children:[Text(plan.action.title,style:Theme.of(context).textTheme.headlineMedium),Text(money(plan.action.amount,plan.currency)),const SizedBox(height:24),Text('Безопасно потратить: ${money(plan.snapshot.safeToSpend,plan.currency)}'),Text('В день: ${money(plan.snapshot.safeDailyAmount,plan.currency)}'),Text('Защищённый резерв: ${money(plan.snapshot.minimumBuffer,plan.currency)}'),Text('Обязательства учтены в прогнозе: ${money(plan.snapshot.projectedBalance,plan.currency)}'),Text('Этап: ${plan.state}') ])),
      loading:()=>const Center(child:CircularProgressIndicator()),
      error:(_,__)=>Center(child:Column(mainAxisSize:MainAxisSize.min,children:[const Text('Не удалось загрузить план. Проверьте соединение.'),FilledButton(onPressed:()=>ref.invalidate(planProvider),child:const Text('Повторить'))])),
    ),
  );
}
