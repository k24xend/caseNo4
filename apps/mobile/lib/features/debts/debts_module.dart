import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../today/today_screen.dart';
import '../onboarding/onboarding_models.dart';

final debtsProvider = FutureProvider<List<DebtDto>>(
  (ref) => ref.watch(apiClientProvider).debts(),
);

class DebtsScreen extends ConsumerWidget {
  const DebtsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debts = ref.watch(debtsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Долги')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showDialog<void>(
          context: context,
          builder: (_) => const DebtDialog(),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Добавить'),
      ),
      body: debts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => _Retry(onRetry: () => ref.invalidate(debtsProvider)),
        data: (items) => items.isEmpty
            ? const Center(child: Text('Долгов пока нет'))
            : RefreshIndicator(
                onRefresh: () => ref.refresh(debtsProvider.future),
                child: ListView.builder(
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final debt = items[index];
                    return ListTile(
                      title: Text(debt.name),
                      subtitle: Text(
                        '${money(debt.balance, debt.currency)} · ставка ${(debt.rateBps / 100).toStringAsFixed(2)}%\n'
                        'Минимум ${money(debt.minimumPayment, debt.currency)}, платёж ${debt.dueDay}-го${debt.overdue ? ' · ПРОСРОЧЕН' : ''}',
                      ),
                      isThreeLine: true,
                      onTap: () => showDialog<void>(
                        context: context,
                        builder: (_) => DebtDialog(debt: debt),
                      ),
                      trailing: IconButton(
                        tooltip: 'Удалить долг',
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _delete(context, ref, debt),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, DebtDto debt) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Удалить долг?'),
        content: Text(debt.name),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Отмена')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Удалить')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    await ref.read(apiClientProvider).deleteDebt(debt.id);
    ref.invalidate(debtsProvider);
    ref.invalidate(planProvider);
  }
}

class DebtDialog extends ConsumerStatefulWidget {
  const DebtDialog({super.key, this.debt});
  final DebtDto? debt;

  @override
  ConsumerState<DebtDialog> createState() => _DebtDialogState();
}

class _DebtDialogState extends ConsumerState<DebtDialog> {
  final formKey = GlobalKey<FormState>();
  late final TextEditingController name;
  late final TextEditingController balance;
  late final TextEditingController rate;
  late final TextEditingController minimum;
  bool saving = false;

  @override
  void initState() {
    super.initState();
    final debt = widget.debt;
    name = TextEditingController(text: debt?.name);
    balance = TextEditingController(text: debt == null ? '' : (debt.balance / 100).toStringAsFixed(2));
    rate = TextEditingController(text: debt == null ? '' : (debt.rateBps / 100).toStringAsFixed(2));
    minimum = TextEditingController(text: debt == null ? '' : (debt.minimumPayment / 100).toStringAsFixed(2));
  }

  @override
  void dispose() {
    name.dispose(); balance.dispose(); rate.dispose(); minimum.dispose();
    super.dispose();
  }

  int? minor(String value) => parseMoney(value);

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.debt == null ? 'Новый долг' : 'Изменить долг'),
    content: Form(
      key: formKey,
      child: SingleChildScrollView(
        child: Column(children: [
          TextFormField(controller: name, decoration: const InputDecoration(labelText: 'Название'), validator: (v) => v == null || v.trim().isEmpty ? 'Введите название' : null),
          TextFormField(controller: balance, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Остаток'), validator: (v) => minor(v ?? '') == null || minor(v ?? '') == 0 ? 'Введите положительную сумму' : null),
          TextFormField(controller: rate, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Ставка, %'), validator: (v) => double.tryParse((v ?? '').replaceAll(',', '.')) == null ? 'Введите ставку' : null),
          TextFormField(controller: minimum, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Минимальный платёж'), validator: (v) { final m=minor(v ?? ''); final b=minor(balance.text); if(m==null)return 'Введите сумму'; if(b!=null&&m>b)return 'Платёж не может превышать остаток'; return null; }),
        ]),
      ),
    ),
    actions: [
      TextButton(onPressed: saving ? null : () => Navigator.pop(context), child: const Text('Отмена')),
      FilledButton(onPressed: saving ? null : save, child: saving ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator()) : const Text('Сохранить')),
    ],
  );

  Future<void> save() async {
    if (!formKey.currentState!.validate()) return;
    setState(() => saving = true);
    try {
      await ref.read(apiClientProvider).saveDebt({
        'name': name.text.trim(), 'debt_type': widget.debt?.debtType ?? 'credit',
        'balance': minor(balance.text), 'currency': widget.debt?.currency ?? 'RUB',
        'annual_rate_bps': (double.parse(rate.text.replaceAll(',', '.')) * 100).round(),
        'minimum_payment': minor(minimum.text), 'due_day': widget.debt?.dueDay ?? 15,
        'overdue': widget.debt?.overdue ?? false, 'custom_priority': 0,
      }, id: widget.debt?.id);
      ref.invalidate(debtsProvider); ref.invalidate(planProvider);
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Не удалось сохранить долг. Попробуйте снова.')));
    } finally { if (mounted) setState(() => saving = false); }
  }
}

class _Retry extends StatelessWidget {
  const _Retry({required this.onRetry}); final VoidCallback onRetry;
  @override Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const Text('Не удалось загрузить долги'), FilledButton(onPressed: onRetry, child: const Text('Повторить'))]));
}
