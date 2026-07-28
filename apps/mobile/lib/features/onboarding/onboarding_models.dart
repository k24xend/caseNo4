import 'dart:math';

const maxMoneyMinor = 100000000000;

typedef Json = Map<String, dynamic>;

int? parseMoney(String raw, {bool allowZero = false}) {
  final value = raw.trim().replaceAll(RegExp(r'[ _]'), '').replaceAll(',', '.');
  if (!RegExp(r'^\d+(?:\.\d{1,2})?$').hasMatch(value)) return null;
  final parts = value.split('.');
  final major = int.tryParse(parts[0]);
  final fraction = parts.length == 1 ? 0 : int.tryParse(parts[1].padRight(2, '0'));
  if (major == null || fraction == null) return null;
  final minor = major * 100 + fraction;
  if ((!allowZero && minor == 0) || minor > maxMoneyMinor) return null;
  return minor;
}

DateTime? parseDate(String raw) {
  final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(raw.trim());
  if (match == null) return null;
  final year = int.tryParse(match.group(1) ?? '');
  final month = int.tryParse(match.group(2) ?? '');
  final day = int.tryParse(match.group(3) ?? '');
  if (year == null || month == null || day == null) return null;
  try { final value = DateTime.utc(year, month, day); return value.year == year && value.month == month && value.day == day ? value : null; } catch (_) { return null; }
}
String day(DateTime value) => value.toIso8601String().substring(0, 10);

class IncomeDraft {
  IncomeDraft({required this.name, required this.amount, required this.date, this.confirmed = true, this.recurring = false});
  factory IncomeDraft.fromJson(Json j) => IncomeDraft(name: j['name'] is String ? j['name'] as String : '', amount: j['amount'] is int ? j['amount'] as int : 0, date: DateTime.tryParse(j['due_date'] is String ? j['due_date'] as String : '') ?? DateTime.now(), confirmed: j['confirmed'] is bool ? j['confirmed'] as bool : false, recurring: j['recurring'] is bool ? j['recurring'] as bool : false);
  String name; int amount; DateTime date; bool confirmed, recurring;
  Json toJson() => {'name': name.trim(), 'amount': amount, 'due_date': day(date), 'confirmed': confirmed, 'recurring': recurring};
}
class ExpenseDraft {
  ExpenseDraft({required this.name, required this.amount, required this.date, this.recurring = false});
  factory ExpenseDraft.fromJson(Json j) => ExpenseDraft(name: j['name'] is String ? j['name'] as String : '', amount: j['amount'] is int ? j['amount'] as int : 0, date: DateTime.tryParse(j['due_date'] is String ? j['due_date'] as String : '') ?? DateTime.now(), recurring: j['recurring'] is bool ? j['recurring'] as bool : false);
  String name; int amount; DateTime date; bool recurring;
  Json toJson() => {'name': name.trim(), 'amount': amount, 'due_date': day(date), 'recurring': recurring};
}
class DebtDraft {
  DebtDraft({required this.name, this.type = 'credit', required this.balance, required this.rateBps, required this.minimum, required this.nextPayment, this.overdue = false, this.customPriority = 0});
  factory DebtDraft.fromJson(Json j) => DebtDraft(name: j['name'] is String ? j['name'] as String : '', type: j['debt_type'] is String ? j['debt_type'] as String : 'credit', balance: j['balance'] is int ? j['balance'] as int : 0, rateBps: j['annual_rate_bps'] is int ? j['annual_rate_bps'] as int : 0, minimum: j['minimum_payment'] is int ? j['minimum_payment'] as int : 0, nextPayment: DateTime.tryParse(j['next_payment_date'] is String ? j['next_payment_date'] as String : '') ?? DateTime.now(), overdue: j['overdue'] is bool ? j['overdue'] as bool : false, customPriority: j['custom_priority'] is int ? j['custom_priority'] as int : 0);
  String name, type; int balance, rateBps, minimum, customPriority; DateTime nextPayment; bool overdue;
  Json toJson() => {'name': name.trim(), 'debt_type': type, 'balance': balance, 'annual_rate_bps': rateBps, 'minimum_payment': minimum, 'due_day': nextPayment.day, 'next_payment_date': day(nextPayment), 'overdue': overdue, 'custom_priority': customPriority};
}
class OnboardingDraft {
  OnboardingDraft({String? idempotencyKey}) : idempotencyKey = idempotencyKey ?? _newKey();
  String language = 'ru', currency = 'RUB', idempotencyKey; int available = 0, reserve = 0, step = 0;
  final incomes = <IncomeDraft>[], expenses = <ExpenseDraft>[], debts = <DebtDraft>[];
  Json payload() => {'language': language, 'currency': currency, 'available_now': available, 'minimum_buffer': reserve, 'incomes': incomes.map((e) => e.toJson()).toList(), 'expenses': expenses.map((e) => e.toJson()).toList(), 'debts': debts.map((e) => e.toJson()).toList()};
  Json toJson() => {...payload(), 'step': step, 'idempotency_key': idempotencyKey};
  factory OnboardingDraft.fromJson(Json j) { final d = OnboardingDraft(idempotencyKey: j['idempotency_key'] is String ? j['idempotency_key'] as String : null); d.language = j['language'] is String ? j['language'] as String : 'ru'; d.currency = j['currency'] is String ? j['currency'] as String : 'RUB'; d.available = j['available_now'] is int ? j['available_now'] as int : 0; d.reserve = j['minimum_buffer'] is int ? j['minimum_buffer'] as int : 0; d.step = min(6, max(0, j['step'] is int ? j['step'] as int : 0)); for (final x in j['incomes'] is List ? j['incomes'] as List : const []) { if (x is Json) d.incomes.add(IncomeDraft.fromJson(x)); } for (final x in j['expenses'] is List ? j['expenses'] as List : const []) { if (x is Json) d.expenses.add(ExpenseDraft.fromJson(x)); } for (final x in j['debts'] is List ? j['debts'] as List : const []) { if (x is Json) d.debts.add(DebtDraft.fromJson(x)); } return d; }
  static String _newKey() => '${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 32)}';
}
