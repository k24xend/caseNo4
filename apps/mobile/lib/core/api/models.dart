class TokenPair {
  const TokenPair(this.accessToken, this.refreshToken);
  factory TokenPair.fromJson(Map<String, dynamic> json) => TokenPair(
        json['access_token'] as String,
        json['refresh_token'] as String,
      );
  final String accessToken;
  final String refreshToken;
}

class MoneySnapshot {
  const MoneySnapshot({required this.safeToSpend, required this.safeDailyAmount,
    required this.projectedBalance, required this.monthlyFreeCashFlow,
    required this.minimumBuffer});
  factory MoneySnapshot.fromJson(Map<String, dynamic> json) => MoneySnapshot(
    safeToSpend: json['safe_to_spend'] as int,
    safeDailyAmount: json['safe_daily_amount'] as int,
    projectedBalance: json['projected_balance_before_next_income'] as int,
    monthlyFreeCashFlow: json['monthly_free_cash_flow'] as int,
    minimumBuffer: json['minimum_buffer_target'] as int,
  );
  final int safeToSpend, safeDailyAmount, projectedBalance, monthlyFreeCashFlow, minimumBuffer;
}

class RecommendedAction {
  const RecommendedAction(this.type, this.title, this.amount);
  factory RecommendedAction.fromJson(Map<String, dynamic> json) => RecommendedAction(
    json['type'] as String, json['title'] as String, json['amount'] as int);
  final String type, title;
  final int amount;
}

class DebtForecast {
  const DebtForecast({
    required this.strategy,
    required this.months,
    required this.debtFreeDate,
    required this.totalPaid,
    required this.negativeAmortization,
    required this.order,
  });

  factory DebtForecast.fromJson(Map<String, dynamic> json) => DebtForecast(
        strategy: json['strategy'] as String? ?? 'unknown',
        months: json['months'] as int?,
        debtFreeDate: json['debt_free_date'] == null
            ? null
            : DateTime.tryParse(json['debt_free_date'] as String),
        totalPaid: json['total_paid'] as int? ?? 0,
        negativeAmortization:
            (json['negative_amortization'] as List<dynamic>? ?? const [])
                .whereType<String>()
                .toList(),
        order: (json['order'] as List<dynamic>? ?? const [])
            .whereType<String>()
            .toList(),
      );

  final String strategy;
  final int? months;
  final DateTime? debtFreeDate;
  final int totalPaid;
  final List<String> negativeAmortization;
  final List<String> order;
}

class FinancialPlan {
  const FinancialPlan(
    this.state,
    this.currency,
    this.snapshot,
    this.action, {
    this.debtForecasts = const {},
  });

  factory FinancialPlan.fromJson(Map<String, dynamic> json) {
    final rawForecasts = json['debt_forecasts'];
    final forecasts = <String, DebtForecast>{};
    if (rawForecasts is Map<String, dynamic>) {
      for (final entry in rawForecasts.entries) {
        if (entry.value is Map<String, dynamic>) {
          forecasts[entry.key] =
              DebtForecast.fromJson(entry.value as Map<String, dynamic>);
        }
      }
    }
    return FinancialPlan(
      json['state'] as String,
      json['currency'] as String? ?? 'RUB',
      MoneySnapshot.fromJson(json['snapshot'] as Map<String, dynamic>),
      RecommendedAction.fromJson(json['action'] as Map<String, dynamic>),
      debtForecasts: forecasts,
    );
  }

  final String state;
  final String currency;
  final MoneySnapshot snapshot;
  final RecommendedAction action;
  final Map<String, DebtForecast> debtForecasts;
}

class DebtDto {
  const DebtDto(
    this.id,
    this.name,
    this.balance,
    this.currency,
    this.rateBps,
    this.minimumPayment,
    this.debtType,
    this.dueDay,
    this.overdue,
    this.customPriority,
  );

  factory DebtDto.fromJson(Map<String, dynamic> json) => DebtDto(
        json['id'] as String,
        json['name'] as String,
        json['balance'] as int,
        json['currency'] as String,
        json['annual_rate_bps'] as int,
        json['minimum_payment'] as int,
        json['debt_type'] as String? ?? 'credit',
        json['due_day'] as int? ?? 1,
        json['overdue'] as bool? ?? false,
        json['custom_priority'] as int? ?? 0,
      );

  final String id, name, currency, debtType;
  final int balance, rateBps, minimumPayment, dueDay, customPriority;
  final bool overdue;
}

class TransactionDto {
  const TransactionDto(this.id,this.kind,this.amount,this.currency,this.category,this.description,this.occurredAt);
  factory TransactionDto.fromJson(Map<String,dynamic> json)=>TransactionDto(json['id'] as String,json['kind'] as String,json['amount'] as int,json['currency'] as String,json['category'] as String,json['description'] as String? ?? '',DateTime.parse(json['occurred_at'] as String));
  final String id,kind,currency,category,description;
  final int amount;
  final DateTime occurredAt;
}
