class IncomeDraft {
  IncomeDraft({
    this.name = '',
    this.amount = 0,
    required this.date,
    this.confirmed = true,
    this.recurring = false,
  });

  factory IncomeDraft.fromJson(Map<String, dynamic> json) => IncomeDraft(
        name: json['name'] as String,
        amount: json['amount'] as int,
        date: DateTime.parse(json['due_date'] as String),
        confirmed: json['confirmed'] as bool? ?? true,
        recurring: json['recurring'] as bool? ?? false,
      );

  String name;
  int amount;
  DateTime date;
  bool confirmed;
  bool recurring;

  Map<String, dynamic> toJson() => {
        'name': name,
        'amount': amount,
        'due_date': _date(date),
        'confirmed': confirmed,
        'recurring': recurring,
      };
}

class ExpenseDraft {
  ExpenseDraft({
    this.name = '',
    this.amount = 0,
    required this.date,
    this.recurring = false,
  });

  factory ExpenseDraft.fromJson(Map<String, dynamic> json) => ExpenseDraft(
        name: json['name'] as String,
        amount: json['amount'] as int,
        date: DateTime.parse(json['due_date'] as String),
        recurring: json['recurring'] as bool? ?? false,
      );

  String name;
  int amount;
  DateTime date;
  bool recurring;

  Map<String, dynamic> toJson() => {
        'name': name,
        'amount': amount,
        'due_date': _date(date),
        'recurring': recurring,
      };
}

class DebtDraft {
  DebtDraft({
    this.name = '',
    this.balance = 0,
    this.rateBps = 0,
    this.minimum = 0,
    this.dueDay = 15,
    this.overdue = false,
  });

  factory DebtDraft.fromJson(Map<String, dynamic> json) => DebtDraft(
        name: json['name'] as String,
        balance: json['balance'] as int,
        rateBps: json['annual_rate_bps'] as int,
        minimum: json['minimum_payment'] as int,
        dueDay: json['due_day'] as int,
        overdue: json['overdue'] as bool? ?? false,
      );

  String name;
  int balance;
  int rateBps;
  int minimum;
  int dueDay;
  bool overdue;

  Map<String, dynamic> toJson() => {
        'name': name,
        'balance': balance,
        'annual_rate_bps': rateBps,
        'minimum_payment': minimum,
        'due_day': dueDay,
        'overdue': overdue,
      };
}

class OnboardingDraft {
  OnboardingDraft()
      : idempotencyKey =
            'onboarding-${DateTime.now().microsecondsSinceEpoch}';

  String idempotencyKey;
  String currency = 'RUB';
  int available = 0;
  int reserve = 0;
  int step = 0;
  final incomes = <IncomeDraft>[];
  final expenses = <ExpenseDraft>[];
  final debts = <DebtDraft>[];

  Map<String, dynamic> payload() => {
        'language': 'ru',
        'currency': currency,
        'available_now': available,
        'minimum_buffer': reserve,
        'incomes': incomes.map((item) => item.toJson()).toList(),
        'expenses': expenses.map((item) => item.toJson()).toList(),
        'debts': debts.map((item) => item.toJson()).toList(),
      };

  Map<String, dynamic> toJson() => {
        ...payload(),
        'step': step,
        'idempotency_key': idempotencyKey,
      };

  void restore(Map<String, dynamic> json) {
    step = json['step'] as int? ?? 0;
    idempotencyKey = json['idempotency_key'] as String? ?? idempotencyKey;
    currency = json['currency'] as String? ?? 'RUB';
    available = json['available_now'] as int? ?? 0;
    reserve = json['minimum_buffer'] as int? ?? 0;
    incomes
      ..clear()
      ..addAll((json['incomes'] as List<dynamic>? ?? const [])
          .map((item) => IncomeDraft.fromJson(item as Map<String, dynamic>)));
    expenses
      ..clear()
      ..addAll((json['expenses'] as List<dynamic>? ?? const [])
          .map((item) => ExpenseDraft.fromJson(item as Map<String, dynamic>)));
    debts
      ..clear()
      ..addAll((json['debts'] as List<dynamic>? ?? const [])
          .map((item) => DebtDraft.fromJson(item as Map<String, dynamic>)));
  }
}

int? parseMoney(String value) {
  final normalized = value.replaceAll(RegExp(r'[ _]'), '').replaceAll(',', '.');
  if (!RegExp(r'^\d+(\.\d{0,2})?$').hasMatch(normalized)) return null;
  final parts = normalized.split('.');
  final major = int.tryParse(parts.first);
  if (major == null) return null;
  final fraction = parts.length == 1 ? '' : parts[1];
  return major * 100 + int.parse(fraction.padRight(2, '0'));
}

String moneyInput(int minor) =>
    '${minor ~/ 100}.${(minor % 100).toString().padLeft(2, '0')}';

String _date(DateTime value) => value.toIso8601String().substring(0, 10);
