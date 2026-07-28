import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../today/today_screen.dart';
import '../onboarding/onboarding_models.dart';

final transactionsProvider = FutureProvider<List<TransactionDto>>((ref) => ref.watch(apiClientProvider).transactions());

class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Операции')),
    floatingActionButton: FloatingActionButton.extended(onPressed: () => showDialog<void>(context: context, builder: (_) => const TransactionDialog()), icon: const Icon(Icons.add), label: const Text('Добавить')),
    body: ref.watch(transactionsProvider).when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => Center(child: FilledButton(onPressed: () => ref.invalidate(transactionsProvider), child: const Text('Повторить загрузку'))),
      data: (items) => items.isEmpty ? const Center(child: Text('Операций пока нет')) : RefreshIndicator(onRefresh: () => ref.refresh(transactionsProvider.future), child: ListView.builder(itemCount: items.length, itemBuilder: (_, index) { final item=items[index]; final income=item.kind=='income'; return ListTile(leading: Icon(income ? Icons.arrow_downward : Icons.arrow_upward), title: Text(item.description.isEmpty ? item.category : item.description), subtitle: Text('${item.category} · ${item.occurredAt.day}.${item.occurredAt.month}.${item.occurredAt.year}'), trailing: Text('${income ? '+' : '−'}${money(item.amount,item.currency)}')); })),
    ),
  );
}

class TransactionDialog extends ConsumerStatefulWidget { const TransactionDialog({super.key}); @override ConsumerState<TransactionDialog> createState()=>_TransactionDialogState(); }
class _TransactionDialogState extends ConsumerState<TransactionDialog> {
  final amount=TextEditingController(), category=TextEditingController(), description=TextEditingController(); bool income=false,saving=false;
  @override void dispose(){amount.dispose();category.dispose();description.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>AlertDialog(title: const Text('Новая операция'),content: SingleChildScrollView(child: Column(children:[SwitchListTile(title:Text(income?'Доход':'Расход'),value:income,onChanged:(v)=>setState(()=>income=v)),TextField(controller:amount,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Сумма')),TextField(controller:category,decoration:const InputDecoration(labelText:'Категория')),TextField(controller:description,decoration:const InputDecoration(labelText:'Описание'))])),actions:[TextButton(onPressed:saving?null:()=>Navigator.pop(context),child:const Text('Отмена')),FilledButton(onPressed:saving?null:save,child:const Text('Добавить'))]);
  Future<void> save() async { final value=parseMoney(amount.text); if(value==null||value<=0||category.text.trim().isEmpty){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Заполните положительную сумму и категорию')));return;} setState(()=>saving=true); try { final accounts=await ref.read(apiClientProvider).accounts(); if(accounts.isEmpty)throw StateError('account'); final now=DateTime.now(); await ref.read(apiClientProvider).createTransaction({'account_id':accounts.first['id'],'kind':income?'income':'expense','amount':value,'currency':accounts.first['currency'],'category':category.text.trim(),'description':description.text.trim(),'occurred_at':now.toUtc().toIso8601String()},'tx-${now.microsecondsSinceEpoch}'); ref.invalidate(transactionsProvider);ref.invalidate(planProvider);if(mounted)Navigator.pop(context); } catch(_){if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Не удалось добавить операцию. Повторите попытку.')));} finally{if(mounted)setState(()=>saving=false);} }
}
