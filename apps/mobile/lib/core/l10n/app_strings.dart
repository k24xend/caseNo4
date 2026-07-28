import 'package:flutter/widgets.dart';

class AppStrings {
  const AppStrings(this.locale);
  final Locale locale;
  bool get isRu => locale.languageCode == 'ru';
  String get appName => isRu ? 'ВЫХОД' : 'VYHOD';
  String get today => isRu ? 'Сегодня' : 'Today';
  String get plan => isRu ? 'План' : 'Plan';
  String get debts => isRu ? 'Долги' : 'Debts';
  String get transactions => isRu ? 'Операции' : 'Transactions';
  String get profile => isRu ? 'Профиль' : 'Profile';
  static AppStrings of(BuildContext context) => AppStrings(Localizations.localeOf(context));
}
