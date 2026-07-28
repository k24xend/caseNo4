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

class FinancialPlan {
  const FinancialPlan(this.state, this.currency, this.snapshot, this.action);
  factory FinancialPlan.fromJson(Map<String, dynamic> json) => FinancialPlan(
    json['state'] as String,
    json['currency'] as String? ?? 'RUB',
    MoneySnapshot.fromJson(json['snapshot'] as Map<String, dynamic>),
    RecommendedAction.fromJson(json['action'] as Map<String, dynamic>),
  );
  final String state, currency;
  final MoneySnapshot snapshot;
  final RecommendedAction action;
}

class DebtDto {
  const DebtDto(this.id, this.name, this.balance, this.currency, this.rateBps, this.minimumPayment);
  factory DebtDto.fromJson(Map<String, dynamic> json) => DebtDto(json['id'] as String,
    json['name'] as String, json['balance'] as int, json['currency'] as String,
    json['annual_rate_bps'] as int, json['minimum_payment'] as int);
  final String id, name, currency;
  final int balance, rateBps, minimumPayment;
}
