import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_controller.dart';
import 'onboarding_models.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  static const titles = [
    'Какая у вас базовая валюта?',
    'Сколько денег доступно сейчас?',
    'Источники ближайших доходов',
    'Обязательные расходы',
    'Отдельные долги',
    'Какой резерв защитить?',
    'Проверьте данные',
  ];

  final draft = OnboardingDraft();
  final moneyController = TextEditingController();
  String? error;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  @override
  void dispose() {
    moneyController.dispose();
    super.dispose();
  }

  Future<void> _restore() async {
    final api = ref.read(apiClientProvider);
    final raw = await ref.read(storageProvider).read(await api.scopedKey('onboarding_draft'));
    if (raw == null) return;
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic> || !mounted) return;
    setState(() {
      draft.restore(decoded);
      _syncMoneyField();
    });
  }

  Future<void> _save() async {
    final key = await ref.read(apiClientProvider).scopedKey('onboarding_draft');
    await ref.read(storageProvider).write(key, jsonEncode(draft.toJson()));
  }

  void _syncMoneyField() {
    if (draft.step == 1) moneyController.text = moneyInput(draft.available);
    if (draft.step == 5) moneyController.text = moneyInput(draft.reserve);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text('${draft.step + 1} из 7'),
          leading: IconButton(
            tooltip: draft.step == 0 ? 'Закрыть' : 'Назад',
            icon: Icon(draft.step == 0 ? Icons.close : Icons.arrow_back),
            onPressed: busy ? null : _back,
          ),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LinearProgressIndicator(value: (draft.step + 1) / 7),
                const SizedBox(height: 28),
                Text(titles[draft.step],
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 24),
                Expanded(child: _content()),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(error!,
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.error)),
                  ),
                FilledButton(
                  onPressed: busy ? null : _next,
                  style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(54)),
                  child: busy
                      ? const SizedBox.square(
                          dimension: 22, child: CircularProgressIndicator())
                      : Text(draft.step == 6
                          ? 'Получить план'
                          : 'Продолжить'),
                ),
              ],
            ),
          ),
        ),
      );

  Widget _content() {
    switch (draft.step) {
      case 0:
        return ListView(
          children: ['RUB', 'USD', 'EUR']
              .map((currency) => RadioListTile<String>(
                    value: currency,
                    groupValue: draft.currency,
                    onChanged: (value) =>
                        setState(() => draft.currency = value!),
                    title: Text(currency),
                  ))
              .toList(),
        );
      case 1:
      case 5:
        return TextField(
          controller: moneyController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: draft.step == 1
                ? 'Доступные деньги'
                : 'Защищённый резерв',
            helperText: 'Введите сумму в ${draft.currency}',
          ),
        );
      case 2:
        return _incomeList();
      case 3:
        return _expenseList();
      case 4:
        return _debtList();
      default:
        return _review();
    }
  }

  Widget _incomeList() => _editableList(
        empty: 'Добавьте ожидаемые доходы или продолжите без них.',
        items: draft.incomes,
        title: (item) => item.name,
        subtitle: (item) =>
            '${moneyInput(item.amount)} ${draft.currency} · ${_displayDate(item.date)}'
            '${item.confirmed ? ' · подтверждён' : ' · ожидается'}',
        edit: (index) => _editIncome(index),
        remove: (index) => setState(() => draft.incomes.removeAt(index)),
        addLabel: 'Добавить доход',
        add: () => _editIncome(null),
      );

  Widget _expenseList() => _editableList(
        empty: 'Добавьте обязательные расходы или продолжите без них.',
        items: draft.expenses,
        title: (item) => item.name,
        subtitle: (item) =>
            '${moneyInput(item.amount)} ${draft.currency} · ${_displayDate(item.date)}',
        edit: (index) => _editExpense(index),
        remove: (index) => setState(() => draft.expenses.removeAt(index)),
        addLabel: 'Добавить расход',
        add: () => _editExpense(null),
      );

  Widget _debtList() => _editableList(
        empty: 'Добавьте долги или продолжите, если долгов нет.',
        items: draft.debts,
        title: (item) => item.name,
        subtitle: (item) =>
            '${moneyInput(item.balance)} ${draft.currency} · минимум ${moneyInput(item.minimum)}',
        edit: (index) => _editDebt(index),
        remove: (index) => setState(() => draft.debts.removeAt(index)),
        addLabel: 'Добавить долг',
        add: () => _editDebt(null),
      );

  Widget _editableList<T>({
    required String empty,
    required List<T> items,
    required String Function(T) title,
    required String Function(T) subtitle,
    required ValueChanged<int> edit,
    required ValueChanged<int> remove,
    required String addLabel,
    required VoidCallback add,
  }) =>
      ListView(
        children: [
          if (items.isEmpty) Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(empty),
          ),
          for (var index = 0; index < items.length; index++)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(title(items[index])),
              subtitle: Text(subtitle(items[index])),
              onTap: () => edit(index),
              trailing: IconButton(
                tooltip: 'Удалить',
                onPressed: () => remove(index),
                icon: const Icon(Icons.delete_outline),
              ),
            ),
          OutlinedButton.icon(
              onPressed: add,
              icon: const Icon(Icons.add),
              label: Text(addLabel)),
        ],
      );

  Widget _review() => ListView(
        children: [
          _reviewRow('Валюта', draft.currency),
          _reviewRow('Доступно', '${moneyInput(draft.available)} ${draft.currency}'),
          _reviewRow('Доходов', '${draft.incomes.length}'),
          _reviewRow('Расходов', '${draft.expenses.length}'),
          _reviewRow('Долгов', '${draft.debts.length}'),
          _reviewRow('Резерв', '${moneyInput(draft.reserve)} ${draft.currency}'),
          const SizedBox(height: 12),
          const Text('Можно вернуться назад и исправить любую запись.'),
        ],
      );

  Widget _reviewRow(String label, String value) => ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(label),
        trailing: Text(value),
      );

  Future<void> _back() async {
    if (draft.step == 0) {
      ref.read(authControllerProvider.notifier).logout();
      return;
    }
    setState(() {
      draft.step--;
      error = null;
      _syncMoneyField();
    });
    await _save();
  }

  Future<void> _next() async {
    setState(() => error = null);
    if (draft.step == 1 || draft.step == 5) {
      final amount = parseMoney(moneyController.text);
      if (amount == null) {
        setState(() => error = 'Введите корректную неотрицательную сумму');
        return;
      }
      if (draft.step == 1) {
        draft.available = amount;
      } else {
        draft.reserve = amount;
      }
    }
    if (draft.step < 6) {
      setState(() {
        draft.step++;
        _syncMoneyField();
      });
      await _save();
      return;
    }
    setState(() => busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .completeOnboarding(draft.payload(), draft.idempotencyKey);
      ref.read(authControllerProvider.notifier).completed();
    } catch (_) {
      if (mounted) {
        setState(() => error =
            'Не удалось сохранить данные. Проверьте сеть и повторите попытку.');
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _editIncome(int? index) async {
    final original = index == null ? null : draft.incomes[index];
    final name = TextEditingController(text: original?.name);
    final amount = TextEditingController(
        text: original == null ? '' : moneyInput(original.amount));
    var date = original?.date ?? DateTime.now().add(const Duration(days: 14));
    var confirmed = original?.confirmed ?? true;
    var recurring = original?.recurring ?? false;
    final result = await showDialog<IncomeDraft>(
      context: context,
      builder: (context) => StatefulBuilder(builder: (context, setDialogState) {
        return AlertDialog(
          title: Text(index == null ? 'Новый доход' : 'Изменить доход'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Название')),
              TextField(controller: amount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Сумма')),
              ListTile(contentPadding: EdgeInsets.zero, title: const Text('Дата дохода'), subtitle: Text(_displayDate(date)), onTap: () async { final selected=await _pickDate(date); if(selected!=null)setDialogState(()=>date=selected); }),
              SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Доход подтверждён'), value: confirmed, onChanged: (value)=>setDialogState(()=>confirmed=value)),
              SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Повторяющийся'), value: recurring, onChanged: (value)=>setDialogState(()=>recurring=value)),
            ]),
          ),
          actions: [TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Отмена')),FilledButton(onPressed:(){final minor=parseMoney(amount.text);if(name.text.trim().isEmpty||minor==null||minor<=0)return;Navigator.pop(context,IncomeDraft(name:name.text.trim(),amount:minor,date:date,confirmed:confirmed,recurring:recurring));},child:const Text('Сохранить'))],
        );
      }),
    );
    name.dispose(); amount.dispose();
    if (result == null || !mounted) return;
    setState(() { if(index==null){draft.incomes.add(result);}else{draft.incomes[index]=result;} });
    await _save();
  }

  Future<void> _editExpense(int? index) async {
    final original = index == null ? null : draft.expenses[index];
    final name = TextEditingController(text: original?.name);
    final amount = TextEditingController(
        text: original == null ? '' : moneyInput(original.amount));
    var date = original?.date ?? DateTime.now().add(const Duration(days: 7));
    var recurring = original?.recurring ?? false;
    final result = await showDialog<ExpenseDraft>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(index == null ? 'Новый расход' : 'Изменить расход'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Название'),
                ),
                TextField(
                  controller: amount,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Сумма'),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Дата расхода'),
                  subtitle: Text(_displayDate(date)),
                  onTap: () async {
                    final selected = await _pickDate(date);
                    if (selected != null) {
                      setDialogState(() => date = selected);
                    }
                  },
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Повторяющийся'),
                  value: recurring,
                  onChanged: (value) =>
                      setDialogState(() => recurring = value),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отмена'),
            ),
            FilledButton(
              onPressed: () {
                final minor = parseMoney(amount.text);
                if (name.text.trim().isEmpty || minor == null || minor <= 0) {
                  return;
                }
                Navigator.pop(
                  context,
                  ExpenseDraft(
                    name: name.text.trim(),
                    amount: minor,
                    date: date,
                    recurring: recurring,
                  ),
                );
              },
              child: const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
    name.dispose();
    amount.dispose();
    if (result == null || !mounted) return;
    setState(() {
      if (index == null) {
        draft.expenses.add(result);
      } else {
        draft.expenses[index] = result;
      }
    });
    await _save();
  }

  Future<void> _editDebt(int? index) async {
    final original = index == null ? null : draft.debts[index];
    final name = TextEditingController(text: original?.name);
    final balance = TextEditingController(
        text: original == null ? '' : moneyInput(original.balance));
    final rate = TextEditingController(
        text: original == null
            ? ''
            : (original.rateBps / 100).toStringAsFixed(2));
    final minimum = TextEditingController(
        text: original == null ? '' : moneyInput(original.minimum));
    final dueDay = TextEditingController(text: '${original?.dueDay ?? 15}');
    var overdue = original?.overdue ?? false;
    String? validation;
    final result = await showDialog<DebtDraft>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(index == null ? 'Новый долг' : 'Изменить долг'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Название')),
                TextField(controller: balance, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Текущий остаток')),
                TextField(controller: rate, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Ставка, %')),
                TextField(controller: minimum, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Минимальный платёж')),
                TextField(controller: dueDay, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'День платежа (1–31)')),
                SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Есть просрочка'), value: overdue, onChanged: (value) => setDialogState(() => overdue = value)),
                if (validation != null)
                  Text(validation!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Отмена')),
            FilledButton(
              onPressed: () {
                final debtBalance = parseMoney(balance.text);
                final debtMinimum = parseMoney(minimum.text);
                final percent = double.tryParse(rate.text.replaceAll(',', '.'));
                final day = int.tryParse(dueDay.text);
                if (name.text.trim().isEmpty ||
                    debtBalance == null || debtBalance <= 0 ||
                    debtMinimum == null || debtMinimum > debtBalance ||
                    percent == null || percent < 0 ||
                    day == null || day < 1 || day > 31) {
                  setDialogState(() => validation =
                      'Проверьте суммы, ставку и день платежа. Минимальный платёж не может превышать остаток.');
                  return;
                }
                Navigator.pop(
                  context,
                  DebtDraft(
                    name: name.text.trim(),
                    balance: debtBalance,
                    minimum: debtMinimum,
                    rateBps: (percent * 100).round(),
                    dueDay: day,
                    overdue: overdue,
                  ),
                );
              },
              child: const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
    name.dispose();
    balance.dispose();
    rate.dispose();
    minimum.dispose();
    dueDay.dispose();
    if (result == null || !mounted) return;
    setState(() {
      if (index == null) {
        draft.debts.add(result);
      } else {
        draft.debts[index] = result;
      }
    });
    await _save();
  }

  Future<DateTime?> _pickDate(DateTime initial) => showDatePicker(context:context,initialDate:initial,firstDate:DateTime.now().subtract(const Duration(days:365)),lastDate:DateTime.now().add(const Duration(days:3650)));
  String _displayDate(DateTime date) => '${date.day.toString().padLeft(2,'0')}.${date.month.toString().padLeft(2,'0')}.${date.year}';
}
